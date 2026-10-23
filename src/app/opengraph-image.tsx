import { ImageResponse } from "next/og";
import { PRODUCT_NAME } from "@/lib/brand";

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
          justifyContent: "space-between",
          background: "#060816",
          color: "#f6f7ff",
          fontFamily: "Georgia, serif",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 84,
              height: 84,
              borderRadius: 22,
              background: "#7c4dff",
              color: "#f6f7ff",
              fontSize: 48,
              fontWeight: 700,
            }}
          >
            N
          </div>
          <div style={{ fontSize: 64, fontWeight: 700 }}>{PRODUCT_NAME}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
          <div style={{ fontSize: 48, lineHeight: 1.15 }}>A read-only view of the wallets you watch.</div>
          <div style={{ fontSize: 28, color: "#aeb7d2" }}>
            Tokens, lending, staking, and the costs around them. Nothing is signed here.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
