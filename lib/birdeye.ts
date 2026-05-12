/**
 * Birdeye Data API client.
 *
 * Docs: https://docs.birdeye.so
 * Base URL: https://public-api.birdeye.so
 *
 * All requests are sent with the `x-chain: solana` header. Endpoints fail soft
 * (return `null` on non-200) so a single bad response never breaks a batch scan.
 *
 * NOTE: Some endpoint paths are best-effort against the public docs. Where a path
 * was uncertain at build time we leave a TODO with the docs URL.
 */

import type {
  HoldersInfo,
  NewListing,
  SecurityInfo,
  TokenOverview,
  HolderEntry,
} from "./types";

const BASE_URL = "https://public-api.birdeye.so";
const DEFAULT_TTL_MS = 60_000;

type CacheEntry<T> = { expiresAt: number; value: T };
const cache = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function cacheSet<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS) {
  cache.set(key, { expiresAt: Date.now() + ttlMs, value });
}

function buildHeaders(): HeadersInit {
  const key = process.env.BIRDEYE_API_KEY;
  if (!key) {
    // Surface this clearly — handlers will translate to a 500.
    throw new Error("BIRDEYE_API_KEY is not set");
  }
  return {
    "X-API-KEY": key,
    accept: "application/json",
    "x-chain": "solana",
  };
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/**
 * Low-level fetch wrapper. Returns parsed JSON `data` field on success, `null` otherwise.
 * Birdeye public API consistently wraps payloads as `{ success: true, data: ... }`.
 */
async function birdeyeGet<T>(url: string, ttlMs = DEFAULT_TTL_MS): Promise<T | null> {
  const cached = cacheGet<T>(url);
  if (cached !== undefined) return cached;

  let headers: HeadersInit;
  try {
    headers = buildHeaders();
  } catch (err) {
    console.warn("[birdeye] missing api key:", (err as Error).message);
    return null;
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 4_000);
  try {
    const res = await fetch(url, { headers, cache: "no-store", signal: ac.signal });
    clearTimeout(timer);
    if (!res.ok) {
      // Cache 429s briefly so we stop hammering Birdeye and instead serve
      // partial results to the user.
      if (res.status === 429) cacheSet(url, null as T, 15_000);
      return null;
    }
    const body = (await res.json()) as { success?: boolean; data?: T };
    if (!body || body.success === false) return null;
    const data = (body.data ?? (body as unknown)) as T;
    cacheSet(url, data, ttlMs);
    return data;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Public endpoints                                                          */
/* -------------------------------------------------------------------------- */

interface NewListingResponse {
  items?: Array<Record<string, unknown>>;
  tokens?: Array<Record<string, unknown>>;
}

/**
 * GET /defi/v2/tokens/new_listing
 * Returns recently listed tokens on Solana.
 * TODO verify exact response shape: https://docs.birdeye.so/reference/get_defi-v2-tokens-new-listing
 */
export async function getNewListings(limit = 30): Promise<NewListing[]> {
  const url = buildUrl("/defi/v2/tokens/new_listing", { limit });
  const data = await birdeyeGet<NewListingResponse>(url);
  if (!data) return [];
  const items = data.items ?? data.tokens ?? [];
  return items.map((raw): NewListing => {
    const r = raw as Record<string, unknown>;
    return {
      address: String(r.address ?? r.tokenAddress ?? ""),
      symbol: String(r.symbol ?? ""),
      name: String(r.name ?? ""),
      decimals: typeof r.decimals === "number" ? r.decimals : undefined,
      liquidity: typeof r.liquidity === "number" ? r.liquidity : undefined,
      liquidityAddedAt:
        typeof r.liquidityAddedAt === "string"
          ? r.liquidityAddedAt
          : typeof r.listingTime === "string"
            ? r.listingTime
            : undefined,
      source: typeof r.source === "string" ? r.source : undefined,
      logoURI: typeof r.logoURI === "string" ? r.logoURI : undefined,
    };
  }).filter((t) => t.address.length > 0);
}

/**
 * GET /defi/token_security?address=...
 * Returns mint authority, freeze authority, top-holder concentration, LP lock state, etc.
 * TODO verify exact field names: https://docs.birdeye.so/reference/get_defi-token-security
 */
export async function getTokenSecurity(address: string): Promise<SecurityInfo | null> {
  if (!address) return null;
  const url = buildUrl("/defi/token_security", { address });
  const data = await birdeyeGet<Record<string, unknown>>(url);
  if (!data) return null;

  const num = (k: string): number | undefined =>
    typeof data[k] === "number" ? (data[k] as number) : undefined;
  const bool = (k: string): boolean | undefined =>
    typeof data[k] === "boolean" ? (data[k] as boolean) : undefined;
  const str = (k: string): string | null | undefined => {
    const v = data[k];
    if (v === null) return null;
    if (typeof v === "string") return v;
    return undefined;
  };

  return {
    address,
    mintAuthority: str("mintAuthority"),
    freezeAuthority: str("freezeAuthority"),
    mutableMetadata: bool("mutableMetadata"),
    top10HolderPercent: num("top10HolderPercent"),
    top10UserBalancePercent: num("top10UserBalancePercent"),
    isToken2022: bool("isToken2022"),
    transferFeeEnable: bool("transferFeeEnable"),
    lpLocked: bool("lpLocked"),
    lpBurned: bool("lpBurned"),
    lockedPercent: num("lockedPercent"),
    creationTime:
      typeof data.creationTime === "string"
        ? (data.creationTime as string)
        : typeof data.createdTime === "string"
          ? (data.createdTime as string)
          : undefined,
    totalSupply: num("totalSupply"),
    holderCount: num("holderCount"),
    raw: data,
  };
}

/**
 * GET /defi/token_overview?address=...
 * Market snapshot: price, liquidity, mcap, volume.
 * TODO verify: https://docs.birdeye.so/reference/get_defi-token-overview
 */
export async function getTokenOverview(address: string): Promise<TokenOverview | null> {
  if (!address) return null;
  const url = buildUrl("/defi/token_overview", { address });
  const data = await birdeyeGet<Record<string, unknown>>(url);
  if (!data) return null;

  const num = (k: string): number | undefined =>
    typeof data[k] === "number" ? (data[k] as number) : undefined;
  const str = (k: string): string | undefined =>
    typeof data[k] === "string" ? (data[k] as string) : undefined;

  return {
    address,
    symbol: str("symbol"),
    name: str("name"),
    decimals: num("decimals"),
    logoURI: str("logoURI"),
    price: num("price"),
    priceChange24h: num("priceChange24hPercent") ?? num("priceChange24h"),
    liquidity: num("liquidity"),
    marketCap: num("mc") ?? num("marketCap"),
    fdv: num("fdv"),
    volume24h: num("v24hUSD") ?? num("volume24h") ?? num("volume24hUSD"),
    holder: num("holder"),
    trade24h: num("trade24h"),
    uniqueWallet24h: num("uniqueWallet24h"),
    numberMarkets: num("numberMarkets"),
    raw: data,
  };
}

/**
 * GET /defi/v3/token/holder (preferred) or /defi/token_holder fallback.
 * TODO verify final path + pagination params:
 *  - https://docs.birdeye.so/reference/get_defi-v3-token-holder
 *  - https://docs.birdeye.so/reference/get_defi-token-holder
 */
export async function getTokenHolders(address: string, limit = 10): Promise<HoldersInfo | null> {
  if (!address) return null;

  const tryUrl = async (path: string): Promise<HoldersInfo | null> => {
    const url = buildUrl(path, { address, offset: 0, limit });
    const data = await birdeyeGet<{
      items?: Array<Record<string, unknown>>;
      total?: number;
    }>(url);
    if (!data) return null;

    const rawItems = data.items ?? [];
    const items: HolderEntry[] = rawItems.map((raw): HolderEntry => {
      const r = raw as Record<string, unknown>;
      const ui = r["ui_amount"] ?? r["uiAmount"] ?? r["amount"];
      const amount = typeof ui === "number" ? ui : Number(ui ?? 0);
      const explicit =
        typeof r.percentage === "number"
          ? r.percentage
          : typeof r.percent === "number"
            ? r.percent
            : undefined;
      // We deliberately do NOT infer percentage from the visible sample —
      // top-N relative to itself is always ~100% and would mislead scoring.
      // Real concentration needs total supply, which lives behind premium
      // token_security on Birdeye. If `percentage` is missing, we skip the
      // concentration rule rather than fabricate it.
      return {
        owner: String(r.owner ?? r.address ?? ""),
        amount,
        percentage: explicit,
      };
    });
    return { address, total: data.total ?? items.length, items };
  };

  // v3 is the supported path on the free tier; do not retry against the
  // legacy `/defi/token_holder` endpoint — that just doubles 429s.
  return tryUrl("/defi/v3/token/holder");
}

/** Test-only: clear the in-memory cache. */
export function __clearBirdeyeCache() {
  cache.clear();
}
