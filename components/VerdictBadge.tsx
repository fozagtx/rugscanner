import type { Verdict } from "@/lib/types";

type Size = "sm" | "md" | "lg";

interface Props {
  verdict: Verdict;
  score: number;
  size?: Size;
  className?: string;
}

const sizeClasses: Record<Size, string> = {
  sm: "px-2 py-0.5 text-[10px] gap-1.5",
  md: "px-2.5 py-1 text-xs gap-2",
  lg: "px-3 py-1.5 text-sm gap-2.5",
};

const scoreSizeClasses: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

function verdictClass(v: Verdict): string {
  if (v === "WORTH") return "verdict-worth";
  if (v === "WATCH") return "verdict-watch";
  return "verdict-avoid";
}

export function VerdictBadge({
  verdict,
  score,
  size = "md",
  className = "",
}: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <span
      className={`inline-flex items-center border rounded-sm font-semibold tracking-wider uppercase ${sizeClasses[size]} ${verdictClass(verdict)} ${className}`}
    >
      <span>{verdict}</span>
      <span
        className={`mono font-bold ${scoreSizeClasses[size]}`}
        aria-label={`score ${clamped}`}
      >
        {clamped}
      </span>
    </span>
  );
}
