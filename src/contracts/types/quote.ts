export type PricingModel = "flat" | "hourly_with_minimum" | "per_sqft";

export interface QuoteFee {
  id: string;
  quoteId: string;
  feeType: string;
  amount: number;
}

export interface Quote {
  id: string;
  callId: string;
  jobSpecId: string;
  vendorId: string;
  basePrice: number;
  normalizedTotal: number;
  pricingModel: PricingModel;
  fees: QuoteFee[];
  redFlag: boolean;
  round: 1 | 2;
}

