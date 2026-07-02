import type { NextConfig } from "next";

// Conservative hardening baseline. A full Content-Security-Policy is left out
// deliberately: wallet SDKs (OnchainKit/Coinbase) and Next's inline runtime
// need careful allowlisting — add one as a dedicated task, not a default.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // The app sets auth cookies; never allow it to be framed (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
