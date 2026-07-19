import { expect, test } from "@playwright/test";

test("live dashboard shows simulated calls via polling", async ({ page, request }) => {
  const startResponse = await request.post("/api/intake/start", {
    data: { geo: "Austin, TX" },
  });
  const { jobSpecId, sessionId } = await startResponse.json();
  await request.post("/api/intake/sync-voice", { data: { jobSpecId, sessionId } });
  await request.post(`/api/job-specs/${jobSpecId}/confirm`);
  await request.post(`/api/calls/${jobSpecId}/start`);

  await page.goto(`/calls/${jobSpecId}`);
  await expect(page.getByTestId("live-calls-screen")).toBeVisible();
  await expect(page.getByTestId("live-call-row").first()).toBeVisible();
  await expect(page.getByTestId("live-transport-mode")).toContainText("polling");
  await expect(page.getByTestId("view-report-link")).toBeVisible();
});
