import type { Vendor } from "@/contracts";

export function scoreTrust(vendor: Vendor): number {
  let score = vendor.rating * 10;
  if (vendor.insuredBonded) score += 20;
  if (vendor.hasGuarantee) score += 10;
  score += Math.min(vendor.reviewCount / 50, 20);
  return Math.min(100, Math.round(score));
}
