import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#05060a",
          color: "#f5f6fa",
          fontFamily: "sans-serif",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#0052ff",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            B
          </div>
          <div style={{ fontSize: 56, fontWeight: 700 }}>Base Wealth Tracker</div>
        </div>
        <div style={{ marginTop: 32, fontSize: 30, color: "rgba(245,246,250,0.6)" }}>
          Track your onchain net worth and DeFi pools on Base.
        </div>
      </div>
    ),
    { ...size },
  );
}
