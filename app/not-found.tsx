import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 w-full">
      <div className="mx-auto max-w-2xl px-5 sm:px-8 py-20 text-center">
        <p className="label-caps text-[var(--muted)] mb-3">404</p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
          Off the radar.
        </h1>
        <p className="text-[var(--muted-strong)] mb-8">
          This page doesn&apos;t exist. The new listings are back home.
        </p>
        <Link
          href="/"
          className="inline-flex px-4 py-2 border border-[var(--text)] text-[var(--text)] hover:bg-[var(--surface)] text-sm font-medium"
        >
          Back to radar
        </Link>
      </div>
    </main>
  );
}
