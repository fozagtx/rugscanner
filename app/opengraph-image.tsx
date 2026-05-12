import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Safe Listings Radar — rug-scored Solana new listings";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0a",
          color: "#e8e8e8",
          padding: "64px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 22,
            letterSpacing: 4,
            color: "#888",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#10b981",
              boxShadow: "0 0 16px #10b981",
            }}
          />
          Safe Listings Radar
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 56,
            fontSize: 84,
            lineHeight: 1.05,
            fontWeight: 700,
            letterSpacing: -2,
            maxWidth: 1000,
          }}
        >
          Every new Solana token, scored for rug risk before you ape.
        </div>

        <div style={{ flex: 1 }} />

        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
          }}
        >
          <Pill bg="#0e2b21" border="#10b981" color="#10b981" label="WORTH" value="70+" />
          <Pill bg="#2a1f06" border="#f59e0b" color="#f59e0b" label="WATCH" value="40–69" />
          <Pill bg="#2a0d0d" border="#ef4444" color="#ef4444" label="AVOID" value="<40" />
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", color: "#888", fontSize: 22 }}>
            powered by Birdeye Data
          </div>
        </div>
      </div>
    ),
    size,
  );
}

function Pill({
  bg,
  border,
  color,
  label,
  value,
}: {
  bg: string;
  border: string;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 20px",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 6,
        color,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: 2,
      }}
    >
      <span>{label}</span>
      <span style={{ opacity: 0.7, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
