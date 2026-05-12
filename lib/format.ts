/**
 * Formatting helpers for the UI. Pure functions only.
 */

export function formatUsd(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toPrecision(2)}`;
}

export function formatNumber(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

export function formatAge(
  ageSeconds: number | undefined | null,
  listedAt?: string,
): string {
  let secs = ageSeconds;
  if ((secs == null || !Number.isFinite(secs)) && listedAt) {
    const t = Date.parse(listedAt);
    if (!Number.isNaN(t)) {
      secs = Math.max(0, Math.floor((Date.now() - t) / 1000));
    }
  }
  if (secs == null || !Number.isFinite(secs)) return "—";
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    const rem = mins % 60;
    return rem === 0 ? `${hrs}h` : `${hrs}h ${rem}m`;
  }
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

export function shortAddress(addr: string | undefined | null): string {
  if (!addr) return "—";
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function formatTimestamp(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export type Filter = "all" | "worth" | "watch" | "avoid";

export function parseFilter(value: string | null | undefined): Filter {
  switch (value) {
    case "worth":
    case "watch":
    case "avoid":
      return value;
    default:
      return "all";
  }
}
