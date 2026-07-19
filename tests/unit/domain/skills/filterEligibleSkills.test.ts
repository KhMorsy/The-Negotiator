import { describe, expect, it } from "vitest";
import { filterEligibleSkills } from "@/domain/skills/filterEligibleSkills";
import { loadHomeCleaningSkills } from "@/domain/skills/loadSkills";
import type { JobSpec, Quote } from "@/contracts";

const baseJobSpec: JobSpec = {
  id: "job-1",
  jobType: "deep_clean",
  sqft: 1200,
  bedrooms: 2,
  bathrooms: 2,
  frequency: "once",
  addOns: [],
  suppliesProvided: false,
  pets: false,
  accessNotes: "",
  conditionNotes: "",
  geo: "Oakland, CA",
  confirmed: true,
};

describe("filterEligibleSkills", () => {
  it("excludes leverage_competing_bid when quotesInHand is empty", () => {
    const eligible = filterEligibleSkills(loadHomeCleaningSkills(), {
      jobSpec: baseJobSpec,
      quotesInHand: [],
    });

    expect(eligible.map((skill) => skill.id)).not.toContain("leverage_competing_bid");
    expect(eligible.length).toBeGreaterThan(0);
  });

  it("includes leverage_competing_bid when a quote with normalizedTotal exists", () => {
    const quote: Quote = {
      id: "q-1",
      callId: "c-1",
      jobSpecId: baseJobSpec.id,
      vendorId: "v-1",
      basePrice: 200,
      normalizedTotal: 240,
      pricingModel: "flat",
      fees: [],
      redFlag: false,
      round: 1,
    };

    const eligible = filterEligibleSkills(loadHomeCleaningSkills(), {
      jobSpec: baseJobSpec,
      quotesInHand: [quote],
    });

    expect(eligible.map((skill) => skill.id)).toContain("leverage_competing_bid");
  });

  it("excludes leverage_competing_bid when the quote has no real total", () => {
    const quote: Quote = {
      id: "q-incomplete",
      callId: "c-1",
      jobSpecId: baseJobSpec.id,
      vendorId: "v-1",
      basePrice: 0,
      normalizedTotal: 0,
      pricingModel: "flat",
      fees: [],
      redFlag: false,
      round: 1,
    };

    const eligible = filterEligibleSkills(loadHomeCleaningSkills(), {
      jobSpec: baseJobSpec,
      quotesInHand: [quote],
    });

    expect(eligible.map((skill) => skill.id)).not.toContain("leverage_competing_bid");
  });

  it("excludes ask_recurring_discount for one-time jobs", () => {
    const eligible = filterEligibleSkills(loadHomeCleaningSkills(), {
      jobSpec: baseJobSpec,
      quotesInHand: [],
    });

    expect(eligible.map((skill) => skill.id)).not.toContain("ask_recurring_discount");
  });
});
