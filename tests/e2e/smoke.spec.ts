import { test, expect } from "@playwright/test";

test("home page loads The Negotiator hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toContainText("The Negotiator");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "The Negotiator",
  );
  await expect(page.getByText(/dual-income family/i)).toBeVisible();
});
