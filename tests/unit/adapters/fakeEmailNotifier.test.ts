import { describe, expect, it } from "vitest";
import { createFakeEmailNotifier } from "@/adapters/fake/fakeEmailNotifier";
import type { JobSpec } from "@/contracts";

const jobSpec = {
  id: "j1",
  jobType: "deep_clean",
  sqft: 1500,
  bedrooms: 3,
  bathrooms: 2,
  frequency: "once",
  addOns: [],
  suppliesProvided: false,
  pets: false,
  accessNotes: "",
  conditionNotes: "",
  geo: "Austin, TX",
  confirmed: true,
} satisfies JobSpec;

describe("createFakeEmailNotifier", () => {
  it("records sent emails in memory", async () => {
    const notifier = createFakeEmailNotifier();
    const { messageId } = await notifier.sendJobSpecRequest({
      toEmail: "quotes@vendor.com",
      vendorName: "Sparkle Pro",
      jobSpec,
    });
    expect(messageId).toMatch(/^fake-msg-/);
    expect(notifier.sent).toHaveLength(1);
  });
});
