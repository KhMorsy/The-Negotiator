import { describe, expect, it } from "vitest";
import { JobSpecSchema } from "@/contracts/schemas";

describe("JobSpecSchema", () => {
  it("rejects unconfirmed missing required fields", () => {
    const result = JobSpecSchema.safeParse({ id: "x" });
    expect(result.success).toBe(false);
  });

  it("parses a valid job spec", () => {
    const result = JobSpecSchema.safeParse({
      id: "js_1",
      jobType: "deep_clean",
      sqft: 900,
      bedrooms: 2,
      bathrooms: 1,
      frequency: "once",
      addOns: [],
      suppliesProvided: false,
      pets: true,
      accessNotes: "",
      conditionNotes: "dusty",
      geo: "Austin, TX",
      confirmed: false,
    });
    expect(result.success).toBe(true);
  });
});

