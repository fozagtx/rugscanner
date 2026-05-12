/**
 * Rug-safety scoring for newly listed Solana tokens.
 *
 * Pure function — no I/O, no globals. Trivially unit-testable.
 *
 * Two-tier scoring:
 *   - Free-tier signals (always run): liquidity, volume/liquidity ratio,
 *     holder count, top-10 concentration, unique-wallet activity, market
 *     count, age. Powered by /defi/token_overview + /defi/v3/token/holder.
 *   - Premium signals (run only when SecurityInfo is provided): mint
 *     authority, freeze authority, LP lock/burn state. Powered by
 *     /defi/token_security, which requires a Birdeye Premium key.
 *
 * Reasons are prefixed with `+` (bonus) or `-` (penalty) so the UI can
 * render polarity deterministically without string-parsing.
 */

import type {
  HoldersInfo,
  ScoreResult,
  SecurityInfo,
  TokenOverview,
  Verdict,
} from "./types";

const START_SCORE = 50; // neutral baseline
const MIN_SCORE = 0;
const MAX_SCORE = 100;

/**
 * Verdict thresholds. Calibrated against the new_listing feed, where tokens
 * are typically minutes old — overview data is sparse and holder counts low,
 * so the bar for WORTH is intentionally below 70.
 */
const THRESHOLD_WORTH = 65;
const THRESHOLD_WATCH = 35;

function isRevoked(authority: string | null | undefined): boolean {
  if (authority === null) return true;
  if (typeof authority === "string" && authority.trim().length === 0) return true;
  return false;
}

function bandToVerdict(score: number): Verdict {
  if (score >= THRESHOLD_WORTH) return "WORTH";
  if (score >= THRESHOLD_WATCH) return "WATCH";
  return "AVOID";
}

export interface ScoreInput {
  overview?: TokenOverview | null;
  holders?: HoldersInfo | null;
  security?: SecurityInfo | null;
  /** Age of the listing in seconds (from new_listing.liquidityAddedAt). */
  ageSeconds?: number;
}

export function scoreToken(input: ScoreInput): ScoreResult {
  const { overview, holders, security, ageSeconds } = input;
  let score = START_SCORE;
  const reasons: string[] = [];

  /* ============================================================ */
  /*  FREE-TIER SIGNALS                                           */
  /* ============================================================ */

  /* ---- liquidity tiers ----
   *  Tuned for new-listing context: deep liquidity on a fresh launch is the
   *  single strongest WORTH signal. A token with $50k+ liquidity minutes
   *  after listing has had real money committed.
   */
  const liq = overview?.liquidity;
  if (typeof liq === "number") {
    if (liq < 1_000) {
      score -= 25;
      reasons.push(`- Liquidity $${fmt(liq)} — too thin to exit`);
    } else if (liq < 5_000) {
      score -= 10;
      reasons.push(`- Liquidity $${fmt(liq)} under $5k`);
    } else if (liq < 20_000) {
      score += 5;
      reasons.push(`+ Liquidity $${fmt(liq)}`);
    } else if (liq < 50_000) {
      score += 15;
      reasons.push(`+ Liquidity $${fmt(liq)} (>$20k)`);
    } else if (liq < 200_000) {
      score += 25;
      reasons.push(`+ Strong liquidity $${fmt(liq)} (>$50k)`);
    } else {
      score += 30;
      reasons.push(`+ Deep liquidity $${fmt(liq)} (>$200k)`);
    }
  }

  /* ---- volume vs liquidity (interest with wash-trade guard) ---- */
  const vol = overview?.volume24h;
  if (typeof vol === "number" && typeof liq === "number" && liq > 0) {
    const ratio = vol / liq;
    if (ratio < 0.1) {
      score -= 10;
      reasons.push(`- Volume/liquidity ${ratio.toFixed(2)}× — dead book`);
    } else if (ratio > 50) {
      score -= 10;
      reasons.push(`- Volume/liquidity ${ratio.toFixed(0)}× — likely wash`);
    } else if (ratio >= 2 && ratio <= 10) {
      score += 5;
      reasons.push(`+ Volume/liquidity ${ratio.toFixed(1)}× — healthy`);
    }
  }

  /* ---- holder count ---- */
  const holderCount =
    overview?.holder ?? security?.holderCount ?? holders?.total;
  if (typeof holderCount === "number") {
    if (holderCount < 30) {
      score -= 15;
      reasons.push(`- ${holderCount} holders — pre-distribution`);
    } else if (holderCount < 100) {
      score += 3;
      reasons.push(`+ ${holderCount} holders`);
    } else if (holderCount < 500) {
      score += 10;
      reasons.push(`+ ${holderCount} holders (>100)`);
    } else if (holderCount < 2_000) {
      score += 15;
      reasons.push(`+ ${holderCount} holders (>500)`);
    } else {
      score += 20;
      reasons.push(`+ ${holderCount} holders (>2k)`);
    }
  }

  /* ---- top-10 concentration ----
   * Only score if we have a real percentage source. Birdeye's free-tier
   * /v3/token/holder returns ui_amount but not percentage, and we can't
   * fabricate percentage from a top-N sample (it would always be ~100%).
   */
  let top10Pct: number | undefined =
    security?.top10UserBalancePercent ?? security?.top10HolderPercent;
  if (top10Pct === undefined && holders?.items?.length) {
    const top10 = holders.items.slice(0, 10);
    const withPct = top10.filter((h) => typeof h.percentage === "number");
    if (withPct.length > 0) {
      const summed = withPct.reduce((acc, h) => acc + (h.percentage ?? 0), 0);
      // Birdeye sometimes returns percentages as 0-100, sometimes as 0-1.
      top10Pct = summed > 1 ? summed / 100 : summed;
    }
  }
  if (top10Pct !== undefined && top10Pct > 0) {
    const pct = top10Pct * 100;
    if (top10Pct > 0.7) {
      score -= 25;
      reasons.push(`- Top 10 own ${pct.toFixed(1)}% — whale risk`);
    } else if (top10Pct > 0.5) {
      score -= 10;
      reasons.push(`- Top 10 own ${pct.toFixed(1)}%`);
    } else {
      score += 5;
      reasons.push(`+ Top 10 own ${pct.toFixed(1)}%`);
    }
  }

  /* ---- unique wallet activity ---- */
  const wallets = overview?.uniqueWallet24h;
  if (typeof wallets === "number") {
    if (wallets < 20) {
      score -= 5;
      reasons.push(`- ${wallets} unique wallets 24h`);
    } else if (wallets > 100) {
      score += 10;
      reasons.push(`+ ${wallets} unique wallets 24h`);
    }
  }

  /* ---- number of markets ---- */
  const markets = overview?.numberMarkets;
  if (typeof markets === "number") {
    if (markets <= 1) {
      score -= 5;
      reasons.push(`- ${markets} market`);
    } else if (markets > 3) {
      score += 5;
      reasons.push(`+ ${markets} markets`);
    }
  }

  /* ---- age ---- */
  if (typeof ageSeconds === "number" && Number.isFinite(ageSeconds)) {
    if (ageSeconds < 60) {
      score -= 5;
      reasons.push(`- Very fresh (${Math.round(ageSeconds)}s old)`);
    } else if (ageSeconds > 1800) {
      score += 5;
      reasons.push(`+ Settled (${Math.round(ageSeconds / 60)}m old)`);
    }
  }

  /* ============================================================ */
  /*  PREMIUM SIGNALS (require token_security access)             */
  /* ============================================================ */

  if (security) {
    if (security.mintAuthority !== undefined) {
      if (isRevoked(security.mintAuthority)) {
        score += 5;
        reasons.push("+ Mint authority revoked");
      } else {
        score -= 25;
        reasons.push("- Mint authority NOT revoked");
      }
    }

    if (security.freezeAuthority !== undefined) {
      if (isRevoked(security.freezeAuthority)) {
        score += 3;
        reasons.push("+ Freeze authority revoked");
      } else {
        score -= 15;
        reasons.push("- Freeze authority NOT revoked");
      }
    }

    if (security.lpBurned === true) {
      score += 10;
      reasons.push("+ LP burned");
    } else if (security.lpLocked === true) {
      score += 5;
      reasons.push("+ LP locked");
    } else if (security.lpBurned === false && security.lpLocked === false) {
      score -= 25;
      reasons.push("- LP not locked or burned");
    }

    if (security.transferFeeEnable === true) {
      score -= 10;
      reasons.push("- Transfer fee enabled");
    }
  }

  /* ============================================================ */
  /*  clamp + verdict                                             */
  /* ============================================================ */
  score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(score)));
  return { score, verdict: bandToVerdict(score), reasons };
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}
