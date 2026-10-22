import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Coinbase's wallet SDK sends a HEAD request for the current page to read
 * Cross-Origin-Opener-Policy. Unknown routes answer 404, and the SDK then
 * logs that status as a console error. A successful HEAD with a popup-friendly
 * policy keeps the check quiet without changing the GET response.
 */
export function proxy(request: NextRequest) {
  if (request.method !== "HEAD") return NextResponse.next();
  return new NextResponse(null, {
    status: 200,
    headers: { "Cross-Origin-Opener-Policy": "same-origin-allow-popups" },
  });
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|.*\\..*).*)"],
};
