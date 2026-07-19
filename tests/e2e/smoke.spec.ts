import { test, expect } from "@playwright/test";

test("home page loads the Hagal hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toContainText("Hagal");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Hagal calls the cleaners.",
  );
  await expect(page.getByText(/dual-income family/i)).toBeVisible();
});
