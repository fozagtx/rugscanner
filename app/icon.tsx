import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#10b981",
          fontSize: 38,
          fontWeight: 700,
          letterSpacing: -2,
          border: "1px solid #10b981",
          borderRadius: 12,
        }}
      >
        S
      </div>
    ),
    size,
  );
}
