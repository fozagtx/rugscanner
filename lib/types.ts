/**
 * Shared TypeScript types for Safe Listings Radar.
 * Single source of truth for both backend and frontend.
 */

export type Verdict = "AVOID" | "WATCH" | "WORTH";

/**
 * Raw new-listing record as returned by Birdeye's /defi/v2/tokens/new_listing.
 * Field names are best-effort based on Birdeye public docs; we normalise to this shape.
 */
export interface NewListing {
  address: string;
  symbol: string;
  name: string;
  decimals?: number;
  liquidity?: number; // USD
  liquidityAddedAt?: string; // ISO 8601
  source?: string; // e.g. "Raydium", "Orca"
  logoURI?: string;
}

/**
 * Token security signals from /defi/token_security.
 * All fields optional — Birdeye doesn't always populate every signal.
 */
export interface SecurityInfo {
  address: string;
  mintAuthority?: string | null; // null/empty means revoked
  freezeAuthority?: string | null;
  mutableMetadata?: boolean;
  top10HolderPercent?: number; // 0-1 fraction
  top10UserBalancePercent?: number; // 0-1 fraction (excluding LP)
  isToken2022?: boolean;
  transferFeeEnable?: boolean;
  lpLocked?: boolean;
  lpBurned?: boolean;
  lockedPercent?: number; // 0-1 fraction of LP locked
  creationTime?: string; // ISO 8601
  totalSupply?: number;
  holderCount?: number;
  raw?: Record<string, unknown>; // original payload for debugging / forward-compat
}

/**
 * Market / metadata snapshot from /defi/token_overview.
 */
export interface TokenOverview {
  address: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  logoURI?: string;
  price?: number; // USD
  priceChange24h?: number; // percent
  liquidity?: number; // USD
  marketCap?: number; // USD
  fdv?: number; // USD
  volume24h?: number; // USD
  holder?: number; // holder count
  trade24h?: number;
  uniqueWallet24h?: number;
  numberMarkets?: number;
  raw?: Record<string, unknown>;
}

export interface HolderEntry {
  owner: string;
  amount: number;
  percentage?: number; // 0-1
}

export interface HoldersInfo {
  address: string;
  total: number;
  items: HolderEntry[];
}

/**
 * Scoring output. Shape used by /api/scan responses.
 */
export interface ScoreResult {
  score: number; // clamped 0-100
  verdict: Verdict;
  reasons: string[];
}

/**
 * Full enriched token record returned by /api/scan.
 */
export interface ScoredToken {
  address: string;
  symbol: string;
  name: string;
  logoURI?: string;
  price?: number;
  priceChange24h?: number;
  liquidity?: number;
  marketCap?: number;
  volume24h?: number;
  holderCount?: number;
  listedAt?: string; // ISO 8601
  ageSeconds?: number;
  birdeyeUrl: string;
  score: number;
  verdict: Verdict;
  reasons: string[];
  security?: SecurityInfo;
}

export interface ScanResponse {
  generatedAt: string; // ISO 8601
  count: number;
  tokens: ScoredToken[];
}

export interface ScanErrorResponse {
  error: string;
  detail?: string;
}
