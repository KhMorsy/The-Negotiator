import type { JobSpec, Quote, ReportPrimary, Vendor } from "@/contracts";

export const mockJobSpec: JobSpec = {
  id: "job-demo-001",
  jobType: "recurring_weekly",
  sqft: 1800,
  bedrooms: 3,
  bathrooms: 2,
  frequency: "weekly",
  addOns: ["inside_fridge", "inside_oven"],
  suppliesProvided: false,
  pets: true,
  accessNotes: "Gate code 4821; dog friendly",
  conditionNotes: "Light clutter, no heavy grime",
  geo: "Austin, TX",
  confirmed: false,
  leverageQuoteAmount: 185,
};

export const mockVendors: Vendor[] = [
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

export const mockQuotes: Quote[] = [
  {
    id: "quote-001",
    callId: "call-r1-001",
    jobSpecId: "job-demo-001",
    vendorId: "vendor-tough",
    basePrice: 195,
    normalizedTotal: 210,
    pricingModel: "flat",
    fees: [
      {
        id: "fee-001",
        quoteId: "quote-001",
        feeType: "supplies",
        amount: 15,
      },
    ],
    redFlag: false,
    round: 1,
  },
  {
    id: "quote-002",
    callId: "call-r1-002",
    jobSpecId: "job-demo-001",
    vendorId: "vendor-lowball",
    basePrice: 120,
    normalizedTotal: 155,
    pricingModel: "hourly_with_minimum",
    fees: [
      { id: "fee-002", quoteId: "quote-002", feeType: "trip", amount: 35 },
    ],
    redFlag: true,
    round: 1,
  },
  {
    id: "quote-003",
    callId: "call-r1-003",
    jobSpecId: "job-demo-001",
    vendorId: "vendor-upseller",
    basePrice: 220,
    normalizedTotal: 265,
    pricingModel: "per_sqft",
    fees: [
      {
        id: "fee-003",
        quoteId: "quote-003",
        feeType: "first_clean_premium",
        amount: 45,
      },
    ],
    redFlag: false,
    round: 1,
  },
];

export const mockReportPrimary: ReportPrimary = {
  jobSpecId: "job-demo-001",
  rankedQuotes: mockQuotes,
  recommendedQuoteId: "quote-001",
  plainLanguageWhy:
    "Sparkle Pro Clean offers the best balance of insured service, transparent flat pricing at $210/visit, and no red flags for your weekly recurring clean.",
};
