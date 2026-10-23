import { afterEach, describe, expect, it } from "vitest";
import { isCronAuthorized } from "./cronAuth";

const ORIGINAL = process.env.CRON_SECRET;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL;
});

function request(url: string, authorization?: string): Request {
  return new Request(url, {
    headers: authorization ? { authorization } : undefined,
  });
}

describe("isCronAuthorized", () => {
  it("refuses when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    expect(
      isCronAuthorized(request("https://www.novafolio.app/api/cron/alerts", "Bearer anything")),
    ).toBe(false);
  });

  it("accepts the secret only as an Authorization Bearer header", () => {
    process.env.CRON_SECRET = "scheduled-secret";
    expect(
      isCronAuthorized(
        request("https://www.novafolio.app/api/cron/alerts", "Bearer scheduled-secret"),
      ),
    ).toBe(true);
  });

  it("rejects a matching secret in the query string", () => {
    process.env.CRON_SECRET = "scheduled-secret";
    expect(
      isCronAuthorized(
        request("https://www.novafolio.app/api/cron/snapshot?secret=scheduled-secret"),
      ),
    ).toBe(false);
  });

  it("rejects a wrong bearer token", () => {
    process.env.CRON_SECRET = "scheduled-secret";
    expect(
      isCronAuthorized(request("https://www.novafolio.app/api/cron/alerts", "Bearer other")),
    ).toBe(false);
  });
});
