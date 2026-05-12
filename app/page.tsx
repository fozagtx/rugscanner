import type { ScanResponse, ScoredToken } from "@/lib/types";
import { TokenCard } from "@/components/TokenCard";
import { FilterChips } from "@/components/FilterChips";
import { LiveTimestamp } from "@/components/LiveTimestamp";
import { parseFilter, type Filter } from "@/lib/format";
import { headers } from "next/headers";

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

async function fetchScan(): Promise<ScanResponse | null> {
  const explicitBase = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  let baseUrl = explicitBase;
  if (!baseUrl) {
    try {
      const h = await headers();
      const host = h.get("x-forwarded-host") ?? h.get("host");
      const proto =
        h.get("x-forwarded-proto") ??
        (host?.startsWith("localhost") ? "http" : "https");
      if (host) baseUrl = `${proto}://${host}`;
    } catch {
      // not in a request context; fall through to localhost
    }
  }
  const url = `${baseUrl ?? "http://localhost:3000"}/api/scan?limit=12`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as ScanResponse;
  } catch {
    return null;
  }
}

function applyFilter(tokens: ScoredToken[], filter: Filter): ScoredToken[] {
  if (filter === "worth") return tokens.filter((t) => t.verdict === "WORTH");
  if (filter === "watch") return tokens.filter((t) => t.verdict === "WATCH");
  if (filter === "avoid") return tokens.filter((t) => t.verdict === "AVOID");
  return tokens;
}

function countVerdicts(tokens: ScoredToken[]) {
  const counts = { all: tokens.length, worth: 0, watch: 0, avoid: 0 };
  for (const t of tokens) {
    if (t.verdict === "WORTH") counts.worth++;
    else if (t.verdict === "WATCH") counts.watch++;
    else if (t.verdict === "AVOID") counts.avoid++;
  }
  return counts;
}

export default async function Home({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filter = parseFilter(sp.filter);

  const data = await fetchScan();
  const allTokens = (data?.tokens ?? [])
    .slice()
    .sort((a, b) => b.score - a.score);
  const counts = countVerdicts(allTokens);
  const visible = applyFilter(allTokens, filter);
  const generatedAt = data?.generatedAt ?? new Date().toISOString();

  return (
    <main className="flex-1 w-full">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10 sm:py-14">
        {/* Hero */}
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 label-caps border border-[var(--border)] px-2 py-1">
              <span
                className="w-1.5 h-1.5 rounded-full bg-[var(--green)]"
                aria-hidden
              />
              Powered by Birdeye Data
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            Safe Listings Radar
          </h1>
          <p className="mt-3 text-base sm:text-lg text-[var(--muted-strong)] max-w-2xl">
            Every new Solana token, scored for rug risk before you ape.
          </p>

          <div className="mt-5 flex items-center gap-2 text-xs label-caps">
            <span>Last updated</span>
            <LiveTimestamp iso={generatedAt} />
          </div>
        </header>

        {/* Verdict counter row */}
        <section
          aria-label="Verdict summary"
          className="border-y border-[var(--border)] py-6 mb-8"
        >
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <VerdictCount label="WORTH" value={counts.worth} tone="green" />
            <span className="text-[var(--muted)]">·</span>
            <VerdictCount label="WATCH" value={counts.watch} tone="yellow" />
            <span className="text-[var(--muted)]">·</span>
            <VerdictCount label="AVOID" value={counts.avoid} tone="red" />
          </div>
        </section>

        {/* Filter chips */}
        <div className="mb-8">
          <FilterChips counts={counts} />
        </div>

        {/* Grid */}
        {allTokens.length === 0 ? (
          <EmptyState />
        ) : visible.length === 0 ? (
          <FilteredEmptyState filter={filter} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((t) => (
              <TokenCard key={t.address} token={t} />
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-[var(--muted)]">
            Submitted to{" "}
            <span className="text-[var(--text)]">Birdeye Data BIP Sprint 4</span>
            .
          </p>
          <nav className="flex items-center gap-4 text-sm">
            <a
              href="https://twitter.com/intent/tweet?text=Safe%20Listings%20Radar%20%E2%80%94%20rug-scored%20Solana%20new%20listings"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--muted-strong)] hover:text-[var(--text)]"
            >
              Share on X
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--muted-strong)] hover:text-[var(--text)]"
            >
              GitHub
            </a>
            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--muted-strong)] hover:text-[var(--text)]"
            >
              Discord
            </a>
            <a
              href="/changelog"
              className="text-[var(--muted-strong)] hover:text-[var(--text)]"
            >
              Changelog
            </a>
          </nav>
        </footer>
      </div>
    </main>
  );
}

function VerdictCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "yellow" | "red";
}) {
  const color =
    tone === "green"
      ? "text-[var(--green)]"
      : tone === "yellow"
        ? "text-[var(--yellow)]"
        : "text-[var(--red)]";
  return (
    <div className="flex items-baseline gap-2">
      <span className={`mono font-bold text-3xl sm:text-4xl ${color}`}>
        {value}
      </span>
      <span className="label-caps">{label}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-[var(--border)] p-12 text-center">
      <h2 className="text-lg font-medium mb-2">No fresh listings yet</h2>
      <p className="text-sm text-[var(--muted)]">
        Check back in a minute — we re-scan Solana new listings every 60
        seconds.
      </p>
    </div>
  );
}

function FilteredEmptyState({ filter }: { filter: Filter }) {
  const labels: Record<Filter, string> = {
    all: "any verdict",
    worth: "WORTH (70+)",
    watch: "WATCH (40–69)",
    avoid: "AVOID (<40)",
  };
  return (
    <div className="border border-[var(--border)] p-12 text-center">
      <h2 className="text-lg font-medium mb-2">No tokens match this filter</h2>
      <p className="text-sm text-[var(--muted)]">
        Nothing in the {labels[filter]} bucket on this scan.
      </p>
    </div>
  );
}
