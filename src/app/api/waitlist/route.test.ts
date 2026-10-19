import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  delete process.env.VERCEL;
  delete process.env.DATABASE_URL;
  vi.resetModules();
});

describe("POST /api/waitlist", () => {
  it("does not accept emails on Vercel when DATABASE_URL is unset", async () => {
    process.env.VERCEL = "1";
    delete process.env.DATABASE_URL;
    vi.resetModules();

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "person@example.com" }),
      }),
    );

    expect(res.status).toBe(503);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("store_unavailable");
  });
});
