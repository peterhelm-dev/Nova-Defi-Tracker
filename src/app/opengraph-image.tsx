import { ImageResponse } from "next/og";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";

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
          background: "#060816",
          color: "#f6f7ff",
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
              borderRadius: 16,
              background: "#7c4dff",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            N
          </div>
          <div style={{ fontSize: 64, fontWeight: 700 }}>{PRODUCT_NAME}</div>
        </div>
        <div style={{ marginTop: 28, fontSize: 32, color: "rgba(246,247,255,0.72)" }}>
          {PRODUCT_TAGLINE}
        </div>
      </div>
    ),
    { ...size },
  );
}
