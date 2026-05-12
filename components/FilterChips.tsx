"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { parseFilter, type Filter } from "@/lib/format";

interface Props {
  counts: {
    all: number;
    worth: number;
    watch: number;
    avoid: number;
  };
}

const OPTIONS: { value: Filter; label: string; sub: string; tone: string }[] = [
  { value: "all", label: "All", sub: "", tone: "neutral" },
  { value: "worth", label: "Worth", sub: "70+", tone: "green" },
  { value: "watch", label: "Watch", sub: "40–69", tone: "yellow" },
  { value: "avoid", label: "Avoid", sub: "<40", tone: "red" },
];

export function FilterChips({ counts }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const active = parseFilter(params.get("filter"));

  const setFilter = useCallback(
    (f: Filter) => {
      const next = new URLSearchParams(params.toString());
      if (f === "all") next.delete("filter");
      else next.set("filter", f);
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `/?${qs}` : "/", { scroll: false });
      });
    },
    [params, router],
  );

  return (
    <div
      className={`flex flex-wrap gap-2 ${isPending ? "opacity-70" : ""}`}
      role="tablist"
      aria-label="Filter by verdict"
    >
      {OPTIONS.map((opt) => {
        const isActive = active === opt.value;
        const count = counts[opt.value];
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => setFilter(opt.value)}
            className={`group inline-flex items-baseline gap-2 px-3 py-1.5 text-sm border transition-colors duration-150 ${
              isActive
                ? toneActiveClass(opt.tone)
                : "border-[var(--border)] text-[var(--muted-strong)] hover:text-[var(--text)] hover:border-[var(--border-hover)]"
            }`}
          >
            <span className="font-medium">{opt.label}</span>
            {opt.sub && (
              <span
                className={`mono text-[11px] ${isActive ? "" : "text-[var(--muted)]"}`}
              >
                {opt.sub}
              </span>
            )}
            <span
              className={`mono text-[11px] ${isActive ? "" : "text-[var(--muted)]"}`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function toneActiveClass(tone: string): string {
  switch (tone) {
    case "green":
      return "verdict-worth";
    case "yellow":
      return "verdict-watch";
    case "red":
      return "verdict-avoid";
    default:
      return "border-[var(--text)] text-[var(--text)] bg-[var(--surface)]";
  }
}
