import type { Vendor, VendorDirectory } from "@/contracts";

const demoVendors: Vendor[] = [
  {
    id: "vendor-tough",
    name: "Sparkle Pro Clean",
    phone: "+15125550101",
    rating: 4.7,
    reviewCount: 312,
    insuredBonded: true,
    hasGuarantee: true,
    source: "fake",
  },
  {
    id: "vendor-lowball",
    name: "Budget Shine Co",
    phone: "+15125550102",
    rating: 3.9,
    reviewCount: 48,
    insuredBonded: false,
    hasGuarantee: false,
    source: "fake",
  },
  {
    id: "vendor-upseller",
    name: "Premium Nest Services",
    phone: "+15125550103",
    rating: 4.9,
    reviewCount: 890,
    insuredBonded: true,
    hasGuarantee: true,
    source: "fake",
  },
];

export function createFakeVendorDirectory(): VendorDirectory {
  return {
    async findVendors({ limit }) {
      return demoVendors.slice(0, limit);
    },
  };
}

