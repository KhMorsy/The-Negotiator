import { describe, expect, it } from "vitest";
import { buildJobSpec, JobSpecValidationError } from "@/domain/jobSpec/buildJobSpec";

describe("buildJobSpec", () => {
  it("merges voice and document partials with document winning on conflict", () => {
    const result = buildJobSpec(
      { sqft: 1600, bedrooms: 2, bathrooms: 2, pets: true },
      { sqft: 1800, leverageQuoteAmount: 185 },
      { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" },
    );
    expect(result).toMatchObject({ sqft: 1800, leverageQuoteAmount: 185, pets: true, confirmed: false });
  });
  it("throws when sqft is zero", () => {
    expect(() => buildJobSpec({}, {}, { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" })).toThrow(JobSpecValidationError);
  });
});
