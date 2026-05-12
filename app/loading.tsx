export default function Loading() {
  return (
    <main className="flex-1 w-full">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10 sm:py-14">
        {/* Hero skeleton */}
        <header className="mb-10">
          <div className="h-6 w-44 skeleton mb-4" />
          <div className="h-12 w-80 skeleton mb-3" />
          <div className="h-5 w-96 max-w-full skeleton" />
          <div className="h-4 w-40 skeleton mt-5" />
        </header>

        {/* Counter skeleton */}
        <section className="border-y border-[var(--border)] py-6 mb-8">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-baseline gap-2">
                <div className="h-9 w-12 skeleton" />
                <div className="h-3 w-14 skeleton" />
              </div>
            ))}
          </div>
        </section>

        {/* Filter chips skeleton */}
        <div className="mb-8 flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-24 skeleton" />
          ))}
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] p-5">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex-1">
          <div className="h-6 w-20 skeleton mb-2" />
          <div className="h-4 w-32 skeleton" />
        </div>
        <div className="h-7 w-24 skeleton" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-3 w-16 skeleton mb-1.5" />
            <div className="h-5 w-20 skeleton" />
          </div>
        ))}
      </div>
      <div className="pt-4 border-t border-[var(--border)] flex gap-1.5">
        <div className="h-5 w-20 skeleton" />
        <div className="h-5 w-24 skeleton" />
        <div className="h-5 w-16 skeleton" />
      </div>
    </div>
  );
}
