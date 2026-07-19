import type { Quote } from "./quote";

export interface ReportPrimary {
  jobSpecId: string;
  rankedQuotes: Quote[];
  recommendedQuoteId: string;
  plainLanguageWhy: string;
}

export interface ReportDrilldowns {
  savings?: {
    initialTotal: number;
    negotiatedTotal: number;
    marketBenchmark: number;
  };
  redFlags?: Array<{ quoteId: string; reasons: string[] }>;
  trust?: Array<{ vendorId: string; score: number }>;
}

