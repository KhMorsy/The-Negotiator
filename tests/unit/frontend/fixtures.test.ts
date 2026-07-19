import { describe, expect, it } from "vitest";
import {
  mockJobSpec,
  mockReportPrimary,
  mockVendors,
} from "@/frontend/mocks/fixtures";

describe("frontend fixtures", () => {
  it("mockJobSpec is unconfirmed draft", () => {
    expect(mockJobSpec.confirmed).toBe(false);
    expect(mockJobSpec.jobType).toBe("recurring_weekly");
  });

  it("mockReportPrimary has ranked quotes and recommendation", () => {
    expect(mockReportPrimary.rankedQuotes.length).toBeGreaterThan(0);
    expect(mockReportPrimary.recommendedQuoteId).toBeTruthy();
    expect(mockReportPrimary.plainLanguageWhy).toMatch(/insured/i);
  });

  it("mockVendors has at least three entries", () => {
    expect(mockVendors.length).toBeGreaterThanOrEqual(3);
  });
});
