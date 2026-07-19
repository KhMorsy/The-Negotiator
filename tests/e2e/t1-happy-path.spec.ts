import { expect, test } from "@playwright/test";

test("T1 gate: confirm, negotiate, audit price drop, report recommendation", async ({
  page,
  request,
}) => {
  const startResponse = await request.post("/api/intake/start", {
    data: { geo: "Austin, TX" },
  });
  expect(startResponse.ok()).toBeTruthy();
  const { jobSpecId, sessionId } = await startResponse.json();

  const syncResponse = await request.post("/api/intake/sync-voice", {
    data: { jobSpecId, sessionId },
  });
  expect(syncResponse.ok()).toBeTruthy();

  const confirmResponse = await request.post(`/api/job-specs/${jobSpecId}/confirm`);
  expect(confirmResponse.ok()).toBeTruthy();

  const callsResponse = await request.post(`/api/calls/${jobSpecId}/start`);
  expect(callsResponse.ok()).toBeTruthy();

  const auditResponse = await request.get(`/api/audit/${jobSpecId}`);
  expect(auditResponse.ok()).toBeTruthy();
  const { auditEvents } = await auditResponse.json();
  const moved = auditEvents.some(
    (event: { priceBefore: number | null; priceAfter: number | null }) =>
      event.priceBefore !== null &&
      event.priceAfter !== null &&
      event.priceAfter < event.priceBefore,
  );
  expect(moved).toBe(true);

  await page.goto(`/report/${jobSpecId}`);
  await expect(page.getByTestId("report-recommendation")).toBeVisible();
  await expect(page.getByText(/Recommended/i)).toBeVisible();
});

