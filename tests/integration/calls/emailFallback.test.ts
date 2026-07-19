import { describe, expect, it } from "vitest";
import { createFakeEmailNotifier } from "@/adapters/fake/fakeEmailNotifier";
import { createInMemoryCallRepository } from "@/adapters/fake/inMemoryCallRepository";
import { handleEmailFallback } from "@/app/calls/emailFallbackHandler";
import type { JobSpec } from "@/contracts";

const jobSpec: JobSpec = {
  id: "job-email-1",
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
};

describe("handleEmailFallback", () => {
  it("sends email and sets callback_commitment outcome", async () => {
    const emailNotifier = createFakeEmailNotifier();
    const callRepo = createInMemoryCallRepository();
    const call = await callRepo.create({
      jobSpecId: jobSpec.id,
      vendorId: "vendor-a",
      round: 1,
    });

    const result = await handleEmailFallback(
      { emailNotifier, callRepo },
      {
        callId: call.id,
        jobSpec,
        vendorEmail: "quotes@sparklepro.com",
        vendorName: "Sparkle Pro",
        lastVendorUtterance: "We don't quote over the phone — email us.",
      },
    );

    expect(result.outcome).toBe("callback_commitment");
    expect(result.messageId).toBeTruthy();
    const updated = await callRepo.getById(call.id);
    expect(updated?.outcome).toBe("callback_commitment");
    expect(emailNotifier.sent).toHaveLength(1);
  });

  it("does not throw when email send fails — returns documented_decline", async () => {
    const callRepo = createInMemoryCallRepository();
    const call = await callRepo.create({
      jobSpecId: jobSpec.id,
      vendorId: "vendor-b",
      round: 1,
    });
    const emailNotifier = {
      async sendJobSpecRequest() {
        throw new Error("SMTP down");
      },
    };

    const result = await handleEmailFallback(
      { emailNotifier, callRepo },
      {
        callId: call.id,
        jobSpec,
        vendorEmail: "bad@vendor.com",
        vendorName: "Budget Co",
        lastVendorUtterance: "No phone quotes.",
      },
    );

    expect(result.outcome).toBe("documented_decline");
    const updated = await callRepo.getById(call.id);
    expect(updated?.outcome).toBe("documented_decline");
  });
});
