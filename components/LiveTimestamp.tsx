"use client";

import { useEffect, useState } from "react";

interface Props {
  iso: string;
}

/**
 * Renders a stable "X ago" label, hydrated client-side to avoid timezone/locale mismatch.
 */
export function LiveTimestamp({ iso }: Props) {
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    function tick() {
      const t = Date.parse(iso);
      if (Number.isNaN(t)) {
        setLabel("—");
        return;
      }
      const diff = Math.max(0, Math.floor((Date.now() - t) / 1000));
      if (diff < 5) setLabel("just now");
      else if (diff < 60) setLabel(`${diff}s ago`);
      else if (diff < 3600) setLabel(`${Math.floor(diff / 60)}m ago`);
      else setLabel(`${Math.floor(diff / 3600)}h ago`);
    }
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [iso]);

  return (
    <span className="mono text-[var(--muted-strong)]">{label || "—"}</span>
  );
}
