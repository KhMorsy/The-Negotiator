import { expect, test } from "@playwright/test";

test("T3 gate: room photos merge into intake draft", async ({ request }) => {
  const startRes = await request.post("/api/intake/start", {
    data: { geo: "Austin, TX" },
  });
  expect(startRes.ok()).toBeTruthy();
  const { jobSpecId } = await startRes.json();

  const photoBytes = Buffer.from([0xff, 0xd8, 0xff, 0xdb]);
  const uploadRes = await request.post("/api/intake/upload-photos", {
    multipart: {
      jobSpecId,
      photos: {
        name: "living-room.jpg",
        mimeType: "image/jpeg",
        buffer: photoBytes,
      },
    },
  });
  expect(uploadRes.ok()).toBeTruthy();
  const { jobSpec } = await uploadRes.json();
  expect(jobSpec.sqft).toBe(1850);
  expect(jobSpec.conditionNotes).toBeTruthy();
});

test("T3 gate: co-pilot API disabled by default", async ({ request }) => {
  const res = await request.post("/api/copilot/session", {
    data: { jobSpecId: "job-x", customerPhone: "+15125551212" },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.enabled).toBe(false);
});
