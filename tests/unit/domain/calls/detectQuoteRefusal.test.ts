import { describe, expect, it } from "vitest";
import { detectQuoteRefusal } from "@/domain/calls/detectQuoteRefusal";

describe("detectQuoteRefusal", () => {
  it("detects we dont quote over the phone", () => {
    const result = detectQuoteRefusal("Sorry, we don't quote over the phone.");
    expect(result.refused).toBe(true);
    expect(result.reason).toMatch(/phone/i);
  });

  it("does not flag normal quote", () => {
    const result = detectQuoteRefusal("Our flat rate is $210 per visit.");
    expect(result.refused).toBe(false);
  });
});
