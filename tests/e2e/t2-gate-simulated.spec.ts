import { expect, test } from "@playwright/test";

test.describe("T2 gate — simulated adapters", () => {
  test("intake, calls dashboard, and report drilldowns complete end to end", async ({
    page,
    request,
  }) => {
    const startResponse = await request.post("/api/intake/start", {
      data: { geo: "Austin, TX" },
    });
    const { jobSpecId, sessionId } = await startResponse.json();
    await request.post("/api/intake/sync-voice", { data: { jobSpecId, sessionId } });
    await request.post(`/api/job-specs/${jobSpecId}/confirm`);
    await request.post(`/api/calls/${jobSpecId}/start`);

    await page.goto(`/calls/${jobSpecId}`);
    await expect(page.getByTestId("live-call-row").first()).toBeVisible();

    await page.goto(`/report/${jobSpecId}`);
    await expect(page.getByTestId("report-recommendation")).toBeVisible();
    await expect(page.getByTestId("drilldown-savings")).toBeVisible();
    await expect(page.getByTestId("drilldown-savings")).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );

    const auditResponse = await request.get(`/api/audit/${jobSpecId}`);
    const { auditEvents } = await auditResponse.json();
    expect(
      auditEvents.some(
        (event: { priceBefore: number | null; priceAfter: number | null }) =>
          event.priceBefore !== null &&
          event.priceAfter !== null &&
          event.priceAfter < event.priceBefore,
      ),
    ).toBe(true);
  });
});
