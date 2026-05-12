import { NextResponse } from "next/server";
import {
  getTokenHolders,
  getTokenOverview,
  getTokenSecurity,
} from "@/lib/birdeye";
import { scoreToken } from "@/lib/scoring";
import type { ScanErrorResponse, ScoredToken } from "@/lib/types";

export const dynamic = "force-dynamic";

function birdeyeUrl(address: string): string {
  return `https://birdeye.so/token/${address}?chain=solana`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ address: string }> },
) {
  if (!process.env.BIRDEYE_API_KEY) {
    const body: ScanErrorResponse = {
      error: "Server misconfiguration",
      detail: "BIRDEYE_API_KEY is not set on the server.",
    };
    return NextResponse.json(body, { status: 500 });
  }

  const { address } = await context.params;
  if (!address || address.length < 32) {
    const body: ScanErrorResponse = {
      error: "Invalid address",
      detail: "A Solana token mint address is required.",
    };
    return NextResponse.json(body, { status: 400 });
  }

  const premium = process.env.BIRDEYE_PREMIUM === "true";
  const [security, overview, holders] = await Promise.all([
    premium ? getTokenSecurity(address) : Promise.resolve(null),
    getTokenOverview(address),
    getTokenHolders(address, 20),
  ]);

  if (!security && !overview) {
    const body: ScanErrorResponse = {
      error: "Token not found",
      detail: "Birdeye returned no data for this address.",
    };
    return NextResponse.json(body, { status: 404 });
  }

  const listedAt = security?.creationTime;
  const ageSeconds = listedAt
    ? Math.max(0, Math.round((Date.now() - new Date(listedAt).getTime()) / 1000))
    : undefined;

  const { score, verdict, reasons } = scoreToken({
    overview,
    holders,
    security,
    ageSeconds,
  });

  const token: ScoredToken = {
    address,
    symbol: overview?.symbol ?? "",
    name: overview?.name ?? "",
    logoURI: overview?.logoURI,
    price: overview?.price,
    priceChange24h: overview?.priceChange24h,
    liquidity: overview?.liquidity,
    marketCap: overview?.marketCap,
    volume24h: overview?.volume24h,
    holderCount: overview?.holder ?? security?.holderCount,
    listedAt,
    ageSeconds,
    birdeyeUrl: birdeyeUrl(address),
    score,
    verdict,
    reasons,
    security: security ?? undefined,
  };

  return NextResponse.json(
    { generatedAt: new Date().toISOString(), token, holders },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
