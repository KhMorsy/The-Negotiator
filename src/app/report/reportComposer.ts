import type { JobSpec, QuoteRepository, ReportPrimary, Vendor } from "@/contracts";
import { BELOW_MARKET_PERCENT, MARKET_BENCHMARK_WEEKLY } from "@/domain/report/benchmarks";
import { evaluateRedFlags } from "@/domain/report/evaluateRedFlags";
import { normalizeQuote } from "@/domain/report/normalizeQuote";
import { rankQuotes } from "@/domain/report/rankQuotes";

export class ReportComposer {
  constructor(private readonly deps: { quoteRepo: QuoteRepository; getJobSpec: (id: string) => Promise<JobSpec | null>; getVendors: (id: string) => Promise<Vendor[]> }) {}
  async compose(jobSpecId: string): Promise<ReportPrimary> {
    const jobSpec = await this.deps.getJobSpec(jobSpecId);
    if (!jobSpec) throw new Error(`JobSpec not found: ${jobSpecId}`);
    const vendors = await this.deps.getVendors(jobSpecId);
    const vendorMap = Object.fromEntries(vendors.map((vendor) => [vendor.id, vendor]));
    const quotes = (await this.deps.quoteRepo.listByJobSpec(jobSpecId)).map((quote) => {
      const normalized = normalizeQuote(quote, jobSpec);
      return { ...normalized, redFlag: evaluateRedFlags(normalized, MARKET_BENCHMARK_WEEKLY, BELOW_MARKET_PERCENT).redFlag };
    });
    const { rankedQuotes, recommendedQuoteId } = rankQuotes(quotes, vendorMap);
    const vendor = vendorMap[rankedQuotes[0]?.vendorId];
    const plainLanguageWhy = vendor ? `${vendor.name} offers the best balance of insured service and transparent pricing at $${rankedQuotes[0].normalizedTotal}/visit.` : "Insufficient vendor data to recommend.";
    return { jobSpecId, rankedQuotes, recommendedQuoteId, plainLanguageWhy };
  }
}
