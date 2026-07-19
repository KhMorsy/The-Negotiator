import { describe, expect, it } from "vitest";
import { scoreTrust } from "@/domain/report/scoreTrust";
import type { Vendor } from "@/contracts";

const high: Vendor = { id: "h", name: "High", phone: "+1", rating: 4.8, reviewCount: 500, insuredBonded: true, hasGuarantee: true, source: "fake" };
const low: Vendor = { id: "l", name: "Low", phone: "+1", rating: 3.5, reviewCount: 10, insuredBonded: false, hasGuarantee: false, source: "fake" };
describe("scoreTrust", () => {
  it("scores insured vendor with reviews higher", () => expect(scoreTrust(high)).toBeGreaterThan(scoreTrust(low)));
  it("returns a value between zero and one hundred", () => { expect(scoreTrust(high)).toBeLessThanOrEqual(100); expect(scoreTrust(low)).toBeGreaterThanOrEqual(0); });
});
