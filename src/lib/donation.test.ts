import { describe, expect, it } from "vitest";
import { donationPaymentUri, getDonationConfig, isDonationEnabled } from "./donation";

const ADDR = "0x1111111111111111111111111111111111111111";

describe("getDonationConfig", () => {
  it("is disabled when nothing is set", () => {
    const config = getDonationConfig({});
    expect(config).toEqual({ address: null, coffeeUrl: null });
    expect(isDonationEnabled(config)).toBe(false);
  });

  it("accepts a valid address and https coffee URL", () => {
    const config = getDonationConfig({
      NEXT_PUBLIC_DONATION_ADDRESS: ` ${ADDR} `,
      NEXT_PUBLIC_BUYMEACOFFEE_URL: "https://buymeacoffee.com/nova",
    });
    expect(config.address).toBe(ADDR);
    expect(config.coffeeUrl).toBe("https://buymeacoffee.com/nova");
    expect(isDonationEnabled(config)).toBe(true);
  });

  it("drops an invalid address and non-https URLs", () => {
    const config = getDonationConfig({
      NEXT_PUBLIC_DONATION_ADDRESS: "0x123",
      NEXT_PUBLIC_BUYMEACOFFEE_URL: "javascript:alert(1)",
    });
    expect(config).toEqual({ address: null, coffeeUrl: null });
  });
});

describe("donationPaymentUri", () => {
  it("targets Base mainnet", () => {
    expect(donationPaymentUri(ADDR)).toBe(`ethereum:${ADDR}@8453`);
  });
});
