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
    await page.addInitScript(() => {
      if (localStorage.getItem("nova:e2e-tour") === "1") return;
      localStorage.setItem("nova:tour-complete", "true");
    });
    await mockApiRoutes(page);
  });

  test("shows the empty wallet state and disclaimer footer", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "Track all your crypto wallets in one place",
      }),
    ).toBeVisible();
    await expect(page.getByText(/Read-only and non-custodial/).first()).toBeVisible();
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
    await page.getByRole("combobox", { name: "Sort pools" }).selectOption("apy");
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

  test("pricing presents Pro as coming soon", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Free to use. Pro is not for sale." })).toBeVisible();
    await expect(page.getByText("Coming soon").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Upgrade to Pro" })).toHaveCount(0);
  });

  test("adds a watch-only wallet and shows its balances", async ({ page }) => {
    await page.route("**/api/ens**", (route) =>
      route.fulfill({
        json: {
          address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
          name: "vitalik.eth",
        },
      }),
    );
    await page.route("**/api/portfolio**", (route) =>
      route.fulfill({
        json: {
          configured: true,
          entitled: true,
          degraded: false,
          portfolio: {
            address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
            tokens: [
              {
                symbol: "ETH",
                name: "Ethereum",
                address: "native",
                decimals: 18,
                chain: "ethereum",
                iconUrl: null,
                fungibleId: null,
                balance: 1,
                priceUsd: 3000,
                change24h: 1,
                valueUsd: 3000,
              },
            ],
            positions: [],
            walletUsd: 3000,
            defiUsd: 0,
            totalUsd: 3000,
            chains: ["ethereum"],
            provider: "alchemy",
            coverage: "detected",
            updatedAt: Date.now(),
          },
        },
      }),
    );

    await page.goto("/");
    await page.getByLabel("Wallet address or ENS").fill("vitalik.eth");
    await page.getByRole("button", { name: "Add wallet" }).click();
    await expect(page.getByText("vitalik.eth")).toBeVisible();
    await expect(page.getByText("$3,000").first()).toBeVisible();

    await page.getByRole("button", { name: "Customize" }).click();
    await page.getByLabel("Nickname").fill("Cold storage");
    await page.getByLabel("Nickname").blur();
    await expect(page.getByText("Cold storage")).toBeVisible();
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

  test("shows a skippable tour once and can replay it from settings", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("nova:e2e-tour", "1");
      if (sessionStorage.getItem("nova:e2e-tour-started") === "1") return;
      localStorage.removeItem("nova:tour-complete");
      sessionStorage.setItem("nova:e2e-tour-started", "1");
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "This is Novafolio" })).toBeVisible();
    await page.getByRole("button", { name: "Skip", exact: true }).click();
    await expect(page.getByRole("heading", { name: "This is Novafolio" })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("heading", { name: "This is Novafolio" })).toHaveCount(0);

    await page.goto("/settings");
    await page.getByRole("button", { name: "Replay the tour" }).click();
    await expect(page.getByRole("heading", { name: "This is Novafolio" })).toBeVisible();
  });
});
