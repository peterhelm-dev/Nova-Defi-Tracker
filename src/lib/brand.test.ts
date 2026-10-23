import { afterEach, describe, expect, it } from "vitest";
import { PRODUCTION_SITE_URL, canonicalSiteUrl } from "./brand";

const ORIGINAL = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL;
});

describe("canonicalSiteUrl", () => {
  it("defaults to the www host the apex redirects to", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(PRODUCTION_SITE_URL).toBe("https://www.novafolio.app");
    expect(canonicalSiteUrl()).toBe("https://www.novafolio.app");
  });

  it("uses the origin of NEXT_PUBLIC_SITE_URL when that is set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://preview.example.com/app";
    expect(canonicalSiteUrl()).toBe("https://preview.example.com");
  });
});
