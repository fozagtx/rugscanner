"use client";

import type { ScoredToken } from "@/lib/types";
import { VerdictBadge } from "./VerdictBadge";
import { formatUsd, formatNumber, formatAge } from "@/lib/format";

interface Props {
  token: ScoredToken;
}

interface ReasonTag {
  text: string;
  positive: boolean;
}

/**
 * Best-effort sign detection from reason strings.
 * Reasons are free-form from the backend scorer; we look for leading + / - or polarity keywords.
 */
function classifyReason(raw: string): ReasonTag {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) {
    return { text: trimmed.slice(1).trim(), positive: true };
  }
  if (trimmed.startsWith("-") || trimmed.startsWith("−")) {
    return { text: trimmed.slice(1).trim(), positive: false };
  }
  const lower = trimmed.toLowerCase();
  const negativeMarkers = [
    "not ",
    "no ",
    "missing",
    "unlock",
    "concentrat",
    "risk",
    "warn",
    "low ",
    "high top",
    "mutable",
    "freeze",
    "mint authority",
    "transfer fee",
  ];
  const positiveMarkers = [
    "locked",
    "burned",
    "renounced",
    "revoked",
    "deep ",
    "healthy",
    "verified",
    "strong",
    "safe",
  ];
  if (negativeMarkers.some((m) => lower.includes(m))) {
    return { text: trimmed, positive: false };
  }
  if (positiveMarkers.some((m) => lower.includes(m))) {
    return { text: trimmed, positive: true };
  }
  // Default: neutral-as-negative-leaning for an "AVOID" world; keep visually muted.
  return { text: trimmed, positive: true };
}

/**
 * Pick up to 3 most-informative reasons. Strategy: prefer reasons that match the verdict polarity.
 */
function pickReasons(token: ScoredToken): ReasonTag[] {
  const tagged = (token.reasons ?? []).map(classifyReason);
  if (token.verdict === "AVOID") {
    const negs = tagged.filter((r) => !r.positive);
    return (negs.length >= 3 ? negs : [...negs, ...tagged]).slice(0, 3);
  }
  if (token.verdict === "WORTH") {
    const pos = tagged.filter((r) => r.positive);
    return (pos.length >= 3 ? pos : [...pos, ...tagged]).slice(0, 3);
  }
  return tagged.slice(0, 3);
}

export function TokenCard({ token }: Props) {
  const reasons = pickReasons(token);

  return (
    <a
      href={token.birdeyeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)] transition-colors duration-150 p-5"
    >
      {/* Top row: logo + symbol/name + verdict */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <TokenAvatar src={token.logoURI} symbol={token.symbol} />
          <div className="min-w-0">
            <h3 className="text-xl font-semibold tracking-tight truncate">
              {token.symbol || "—"}
            </h3>
            <p className="text-sm text-[var(--muted)] truncate mt-0.5">
              {token.name || "Unknown"}
            </p>
          </div>
        </div>
        <VerdictBadge verdict={token.verdict} score={token.score} size="md" />
      </div>

      {/* Stats grid — 3x2 */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-3 mb-5">
        <Stat label="Liquidity" value={formatUsd(token.liquidity)} />
        <Stat label="Volume 24h" value={formatUsd(token.volume24h)} />
        <Stat label="Market Cap" value={formatUsd(token.marketCap)} />
        <Stat label="Holders" value={formatNumber(token.holderCount)} />
        <Stat label="Age" value={formatAge(token.ageSeconds, token.listedAt)} />
        <Stat label="Price" value={formatUsd(token.price)} />
      </div>

      {/* Reasons */}
      {reasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-4 border-t border-[var(--border)]">
          {reasons.map((r, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] border rounded-sm ${
                r.positive ? "reason-pos" : "reason-neg"
              }`}
            >
              <span className="mono font-bold">{r.positive ? "+" : "−"}</span>
              <span>{r.text}</span>
            </span>
          ))}
        </div>
      )}
    </a>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label-caps mb-1">{label}</div>
      <div className="mono text-base text-[var(--text)]">{value}</div>
    </div>
  );
}

function TokenAvatar({
  src,
  symbol,
}: {
  src?: string;
  symbol?: string;
}) {
  const fallback = (symbol || "?").slice(0, 2).toUpperCase();
  if (!src) {
    return (
      <div
        className="flex-shrink-0 w-10 h-10 border border-[var(--border)] flex items-center justify-center text-xs mono text-[var(--muted)] bg-[var(--bg)]"
        aria-hidden
      >
        {fallback}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt=""
      width={40}
      height={40}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={(e) => {
        // Fall back to letter avatar on broken image
        const el = e.currentTarget;
        el.style.display = "none";
        const sib = el.nextElementSibling as HTMLElement | null;
        if (sib) sib.style.display = "flex";
      }}
      className="flex-shrink-0 w-10 h-10 object-cover border border-[var(--border)] bg-[var(--bg)]"
    />
  );
}
