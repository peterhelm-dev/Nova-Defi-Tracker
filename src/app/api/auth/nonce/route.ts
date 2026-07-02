import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { generateSiweNonce } from "viem/siwe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const NONCE_COOKIE = "bwt_nonce";

/**
 * Issues a single-use SIWE nonce. The nonce is returned to the client (to put
 * in the message it asks the wallet to sign) and stashed in an httpOnly cookie
 * so /api/auth/verify can confirm the signed message used the nonce we issued.
 */
export async function GET() {
  const nonce = generateSiweNonce();

  const store = await cookies();
  store.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10, // 10 minutes to complete the signature
  });

  return NextResponse.json({ nonce });
}
