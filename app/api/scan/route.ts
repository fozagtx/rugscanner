import { NextResponse } from "next/server";
import {
  getNewListings,
  getTokenHolders,
  getTokenOverview,
  getTokenSecurity,
} from "@/lib/birdeye";
import { scoreToken } from "@/lib/scoring";
import type {
  NewListing,
  ScanErrorResponse,
  ScanResponse,
  ScoredToken,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 60;

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
// Free-tier Birdeye is ~1 request/sec. Two parallel + a small inter-batch
// pause keeps us under the rate limit while staying fast enough for a
// 30-token scan to finish in ~15s.
const BATCH_SIZE = 2;
const BATCH_DELAY_MS = 200;

function birdeyeUrl(address: string): string {
  return `https://birdeye.so/token/${address}?chain=solana`;
}

const PREMIUM = process.env.BIRDEYE_PREMIUM === "true";

async function enrichOne(listing: NewListing): Promise<ScoredToken> {
  const [security, overview, holders] = await Promise.all([
    PREMIUM ? getTokenSecurity(listing.address) : Promise.resolve(null),
    getTokenOverview(listing.address),
    getTokenHolders(listing.address, 10),
  ]);

  const listedAt = listing.liquidityAddedAt ?? security?.creationTime;
  const ageSeconds = listedAt
    ? Math.max(0, Math.round((Date.now() - new Date(listedAt).getTime()) / 1000))
    : undefined;

  // Synthesise an overview when the upstream call returned null (common for
  // tokens minutes old and not yet indexed). At minimum carry the listing's
  // own liquidity so the scorer's liquidity rule can still fire.
  const effectiveOverview =
    overview ??
    (listing.liquidity !== undefined
      ? { address: listing.address, liquidity: listing.liquidity }
      : null);

  const { score, verdict, reasons } = scoreToken({
    overview: effectiveOverview,
    holders,
    security,
    ageSeconds,
  });

  return {
    address: listing.address,
    symbol: overview?.symbol ?? listing.symbol,
    name: overview?.name ?? listing.name,
    logoURI: overview?.logoURI ?? listing.logoURI,
    price: overview?.price,
    priceChange24h: overview?.priceChange24h,
    liquidity: overview?.liquidity ?? listing.liquidity,
    marketCap: overview?.marketCap,
    volume24h: overview?.volume24h,
    holderCount: overview?.holder ?? security?.holderCount,
    listedAt,
    ageSeconds,
    birdeyeUrl: birdeyeUrl(listing.address),
    score,
    verdict,
    reasons,
    security: security ?? undefined,
  };
}

/** Run async tasks in batches of N with a small pause between batches. */
async function runInBatches<T, R>(
  items: T[],
  size: number,
  worker: (item: T) => Promise<R>,
  delayMs: number,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    const settled = await Promise.allSettled(slice.map(worker));
    for (const result of settled) {
      if (result.status === "fulfilled") out.push(result.value);
      else console.warn("[scan] enrich failed:", result.reason);
    }
    if (i + size < items.length && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return out;
}

export async function GET(request: Request) {
  if (!process.env.BIRDEYE_API_KEY) {
    const body: ScanErrorResponse = {
      error: "Server misconfiguration",
      detail: "BIRDEYE_API_KEY is not set on the server.",
    };
    return NextResponse.json(body, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Math.max(
    1,
    Math.min(MAX_LIMIT, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT),
  );

  try {
    const listings = await getNewListings(limit);
    const enriched = await runInBatches(
      listings,
      BATCH_SIZE,
      enrichOne,
      BATCH_DELAY_MS,
    );
    enriched.sort((a, b) => b.score - a.score);

    const body: ScanResponse = {
      generatedAt: new Date().toISOString(),
      count: enriched.length,
      tokens: enriched,
    };

    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=60" },
    });
  } catch (err) {
    const body: ScanErrorResponse = {
      error: "Scan failed",
      detail: (err as Error).message,
    };
    return NextResponse.json(body, { status: 502 });
  }
}
