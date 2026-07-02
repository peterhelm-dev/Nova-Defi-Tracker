import { test, expect, type Page } from "@playwright/test";
import type { DefiPool } from "../src/types";

const MOCK_POOLS: DefiPool[] = [
  {
    id: "pool-aerodrome-usdc-weth",
    project: "Aerodrome",
    symbol: "USDC-WETH",
    chain: "Base",
    tvlUsd: 42_000_000,
    apy: 6.1,
    apyBase: 6.1,
    apyReward: null,
  },
  {
    id: "pool-moonwell-usdc",
    project: "Moonwell",
    symbol: "USDC",
    chain: "Base",
    tvlUsd: 15_500_000,
    apy: 12.34,
    apyBase: 8,
    apyReward: 4.34,
  },
];

async function mockApiRoutes(page: Page) {
  await page.route("**/api/prices", (route) =>
    route.fulfill({ json: { tokens: {}, eth: { usd: 3000 } } }),
  );
  await page.route("**/api/defi-pools", (route) =>
    route.fulfill({ json: { pools: MOCK_POOLS } }),
  );
}

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
  });

  test("shows the empty wallet state and disclaimer footer", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "Connect a wallet to see your Base net worth",
      }),
    ).toBeVisible();
    await expect(page.getByText(/Read-only and non-custodial/)).toBeVisible();
  });

  test("loads, searches, and sorts the DeFi pools section", async ({
    page,
  }) => {
    await page.goto("/");

    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toContainText("Aerodrome");
    await expect(rows.nth(1)).toContainText("Moonwell");

    await page
      .getByPlaceholder("Search project or pair…")
      .fill("moonwell");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Moonwell");

    await page.getByPlaceholder("Search project or pair…").fill("");
    await page.getByRole("combobox").selectOption("apy");
    await expect(rows.first()).toContainText("Moonwell");
    await expect(rows.nth(1)).toContainText("Aerodrome");
  });

  test("reaches the terms page from the footer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Terms" }).click();
    await expect(
      page.getByRole("heading", { name: "Terms of Service" }),
    ).toBeVisible();
  });

  test("shows the privacy policy", async ({ page }) => {
    await page.goto("/privacy");
    await expect(
      page.getByRole("heading", { name: "Privacy Policy" }),
    ).toBeVisible();
  });

  test("shows the support page with FAQ", async ({ page }) => {
    await page.goto("/support");
    await expect(page.getByRole("heading", { name: "Support" })).toBeVisible();
    await expect(
      page.getByText("Is this safe? Can it touch my funds?"),
    ).toBeVisible();
  });

  test("tracks a DeFi pool position", async ({ page }) => {
    await page.goto("/");

    await page
      .locator("table tbody tr")
      .first()
      .getByRole("button", { name: "Track" })
      .click();
    await page.getByPlaceholder("USD amount").fill("500");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Nothing tracked yet")).not.toBeVisible();
    const trackedRow = page.locator("ul li", { hasText: "Aerodrome" });
    await expect(trackedRow).toBeVisible();
    await expect(trackedRow).toContainText("$500.00");
  });
});
