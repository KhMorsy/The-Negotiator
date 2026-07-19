import type {
  AuditEvent,
  JobSpec,
  QuoteRepository,
  ReportDrilldowns,
  ReportPrimary,
  Vendor,
} from "@/contracts";
import {
  BELOW_MARKET_PERCENT,
  MARKET_BENCHMARK_WEEKLY,
} from "@/domain/report/benchmarks";
import { evaluateRedFlags } from "@/domain/report/evaluateRedFlags";
import { normalizeQuote } from "@/domain/report/normalizeQuote";
import { rankQuotes } from "@/domain/report/rankQuotes";
import { scoreTrust } from "@/domain/report/scoreTrust";

export class ReportComposer {
  constructor(
    private readonly deps: {
      quoteRepo: QuoteRepository;
      getAuditEvents?: (jobSpecId: string) => Promise<AuditEvent[]>;
      getJobSpec: (id: string) => Promise<JobSpec | null>;
      getVendors: (id: string) => Promise<Vendor[]>;
    },
  ) {}

  async compose(jobSpecId: string): Promise<ReportPrimary> {
    const jobSpec = await this.requireJobSpec(jobSpecId);
    const vendors = await this.deps.getVendors(jobSpecId);
    const vendorMap = Object.fromEntries(vendors.map((vendor) => [vendor.id, vendor]));
    const quotes = (await this.deps.quoteRepo.listByJobSpec(jobSpecId)).map((quote) => {
      const normalized = normalizeQuote(quote, jobSpec);
      return {
        ...normalized,
        redFlag: evaluateRedFlags(
          normalized,
          MARKET_BENCHMARK_WEEKLY,
          BELOW_MARKET_PERCENT,
        ).redFlag,
      };
    });
    const { rankedQuotes, recommendedQuoteId } = rankQuotes(quotes, vendorMap);
    const vendor = vendorMap[rankedQuotes[0]?.vendorId];
    const plainLanguageWhy = vendor
      ? `${vendor.name} offers the best balance of insured service and transparent pricing at $${rankedQuotes[0].normalizedTotal}/visit.`
      : "Insufficient vendor data to recommend.";

    return { jobSpecId, rankedQuotes, recommendedQuoteId, plainLanguageWhy };
  }

  async composeDrilldowns(jobSpecId: string): Promise<ReportDrilldowns> {
    await this.requireJobSpec(jobSpecId);
    const [vendors, quotes, auditEvents] = await Promise.all([
      this.deps.getVendors(jobSpecId),
      this.deps.quoteRepo.listByJobSpec(jobSpecId),
      this.deps.getAuditEvents?.(jobSpecId) ?? Promise.resolve([]),
    ]);
    const redFlags = quotes.flatMap((quote) => {
      const result = evaluateRedFlags(
        quote,
        MARKET_BENCHMARK_WEEKLY,
        BELOW_MARKET_PERCENT,
      );
      return result.redFlag ? [{ quoteId: quote.id, reasons: result.reasons }] : [];
    });
    const priceMoves = auditEvents.filter(
      (event) => event.priceBefore !== null && event.priceAfter !== null,
    );
    const initialTotal = Math.max(...quotes.map((quote) => quote.normalizedTotal), 0);
    const negotiatedTotal =
      priceMoves.length > 0
        ? Math.min(...priceMoves.map((event) => event.priceAfter as number))
        : Math.min(...quotes.map((quote) => quote.normalizedTotal), initialTotal);

    return {
      savings: {
        initialTotal,
        negotiatedTotal,
        marketBenchmark: MARKET_BENCHMARK_WEEKLY,
      },
      redFlags,
      trust: vendors.map((vendor) => ({
        vendorId: vendor.id,
        score: scoreTrust(vendor),
      })),
    };
  }

  private async requireJobSpec(jobSpecId: string) {
    const jobSpec = await this.deps.getJobSpec(jobSpecId);
    if (!jobSpec) {
      throw new Error(`JobSpec not found: ${jobSpecId}`);
    }
    return jobSpec;
  }
}
