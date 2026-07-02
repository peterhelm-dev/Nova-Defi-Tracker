import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSiweMessage, verifySiweMessage } from "viem/siwe";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
} from "@/lib/server/session";
import { getPublicClient } from "@/lib/server/viemClient";
import { NONCE_COOKIE } from "../nonce/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerifyBody = {
  message?: string;
  signature?: string;
};

/**
 * Verifies a signed SIWE message and, on success, issues a session cookie.
 * The message's nonce must match the one we issued (httpOnly cookie), and the
 * signature is verified against the claimed address — smart-wallet aware via
 * the Base public client.
 */
export async function POST(request: Request) {
  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { message, signature } = body;
  if (!message || !signature) {
    return NextResponse.json(
      { error: "message and signature are required" },
      { status: 400 },
    );
  }

  const store = await cookies();
  const expectedNonce = store.get(NONCE_COOKIE)?.value;
  if (!expectedNonce) {
    return NextResponse.json(
      { error: "Nonce expired — request a new one" },
      { status: 401 },
    );
  }

  const parsed = parseSiweMessage(message);
  if (!parsed.address) {
    return NextResponse.json({ error: "Malformed SIWE message" }, { status: 400 });
  }

  let valid = false;
  try {
    // Cast to the exact client type verifySiweMessage expects — the Base chain's
    // custom formatters otherwise widen the inferred client type incompatibly.
    const client = getPublicClient() as Parameters<typeof verifySiweMessage>[0];
    valid = await verifySiweMessage(client, {
      message,
      signature: signature as `0x${string}`,
      nonce: expectedNonce,
    });
  } catch {
    valid = false;
  }

  if (!valid) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  const address = parsed.address.toLowerCase();
  store.set(SESSION_COOKIE, createSessionToken(address), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  // Nonce is single-use.
  store.delete(NONCE_COOKIE);

  return NextResponse.json({ address });
}
