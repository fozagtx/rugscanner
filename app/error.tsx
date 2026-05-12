"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main className="flex-1 w-full">
      <div className="mx-auto max-w-2xl px-5 sm:px-8 py-20 text-center">
        <p className="label-caps text-[var(--red)] mb-3">Error</p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
          Something broke on this scan.
        </h1>
        <p className="text-[var(--muted-strong)] mb-8">
          The radar hit an unexpected error. Retry — if it persists, the
          Birdeye upstream may be rate-limiting us.
        </p>
        {error.digest && (
          <p className="mono text-xs text-[var(--muted)] mb-6">
            digest {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 border border-[var(--text)] text-[var(--text)] hover:bg-[var(--surface)] text-sm font-medium"
          >
            Retry
          </button>
          <a
            href="/"
            className="px-4 py-2 border border-[var(--border)] text-[var(--muted-strong)] hover:text-[var(--text)] hover:border-[var(--border-hover)] text-sm"
          >
            Home
          </a>
        </div>
      </div>
    </main>
  );
}
