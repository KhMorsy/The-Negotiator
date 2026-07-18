import { describe, expect, it } from "vitest";
import type { JobSpec } from "@/contracts/types";

describe("JobSpec shape", () => {
  it("exports the types module", async () => {
    const mod = await import("@/contracts/types");
    expect(mod).toBeDefined();
  });

  it("accepts a confirmed recurring job fixture", () => {
    const spec: JobSpec = {
      id: "js_1",
      jobType: "recurring_weekly",
      sqft: 1200,
      bedrooms: 3,
      bathrooms: 2,
      frequency: "weekly",
      addOns: ["inside_fridge"],
      suppliesProvided: true,
      pets: false,
      accessNotes: "key under mat",
      conditionNotes: "normal wear",
      geo: "Austin, TX",
      confirmed: true,
    };

    expect(spec.confirmed).toBe(true);
  });
});
