import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog — Safe Listings Radar",
  description: "Release notes and scoring-rule changes for Safe Listings Radar.",
};

interface ChangelogEntry {
  heading: string;
  body: string;
}

function parseChangelog(raw: string): { intro: string; entries: ChangelogEntry[] } {
  // Strip leading H1 if present.
  const lines = raw.split("\n");
  let i = 0;
  while (i < lines.length && !lines[i].startsWith("## ")) i++;
  const intro = lines
    .slice(0, i)
    .join("\n")
    .replace(/^#\s.+\n?/m, "")
    .trim();

  const rest = lines.slice(i).join("\n");
  const sections = rest.split(/^## /m).filter((s) => s.trim().length > 0);
  const entries: ChangelogEntry[] = sections.map((sec) => {
    const nl = sec.indexOf("\n");
    const heading = nl === -1 ? sec.trim() : sec.slice(0, nl).trim();
    const body = nl === -1 ? "" : sec.slice(nl + 1).trim();
    return { heading, body };
  });
  return { intro, entries };
}

async function loadChangelog(): Promise<string | null> {
  try {
    const p = path.join(process.cwd(), "CHANGELOG.md");
    return await readFile(p, "utf8");
  } catch {
    return null;
  }
}

export default async function ChangelogPage() {
  const raw = await loadChangelog();

  return (
    <main className="flex-1 w-full">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-14">
        <Link
          href="/"
          className="label-caps text-[var(--muted)] hover:text-[var(--text)]"
        >
          ← Back to radar
        </Link>

        <h1 className="mt-6 text-3xl sm:text-4xl font-semibold tracking-tight">
          Changelog
        </h1>

        {raw == null ? (
          <p className="mt-8 text-[var(--muted-strong)]">
            No changelog entries yet.
          </p>
        ) : (
          <ChangelogList raw={raw} />
        )}
      </div>
    </main>
  );
}

function ChangelogList({ raw }: { raw: string }) {
  const { intro, entries } = parseChangelog(raw);
  return (
    <div className="mt-10 space-y-12">
      {intro && (
        <p className="text-[var(--muted-strong)] leading-relaxed">{intro}</p>
      )}
      {entries.length === 0 ? (
        <p className="text-[var(--muted-strong)]">No entries yet.</p>
      ) : (
        entries.map((e, i) => (
          <article key={i} className="border-t border-[var(--border)] pt-8">
            <h2 className="mono text-sm label-caps text-[var(--muted-strong)]">
              {e.heading}
            </h2>
            <div className="mt-4 space-y-2 text-[var(--text)] leading-relaxed">
              {e.body
                .split("\n")
                .filter((l) => l.trim().length > 0)
                .map((line, j) => (
                  <ChangelogLine key={j} line={line} />
                ))}
            </div>
          </article>
        ))
      )}
    </div>
  );
}

function ChangelogLine({ line }: { line: string }) {
  const trimmed = line.trim();
  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
    return (
      <div className="flex gap-3">
        <span className="text-[var(--muted)] mono select-none">·</span>
        <span>{trimmed.slice(2)}</span>
      </div>
    );
  }
  if (trimmed.startsWith("### ")) {
    return (
      <h3 className="text-base font-medium mt-4">{trimmed.slice(4)}</h3>
    );
  }
  return <p>{trimmed}</p>;
}
