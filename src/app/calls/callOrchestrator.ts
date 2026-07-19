import { randomUUID } from "node:crypto";
import type {
  AuditEvent,
  AuditRepository,
  CallRepository,
  JobSpec,
  JobSpecRepository,
  PricingModel,
  Quote,
  QuoteRepository,
  TelephonyProvider,
  VendorDirectory,
} from "@/contracts";
import { BELOW_MARKET_PERCENT, MARKET_BENCHMARK_WEEKLY } from "@/domain/report/benchmarks";
import { evaluateRedFlags } from "@/domain/report/evaluateRedFlags";
import { normalizeQuote } from "@/domain/report/normalizeQuote";

type SimulatedQuote = {
  basePrice: number;
  normalizedTotal: number;
  pricingModel: PricingModel;
};

type SimulationTelephony = TelephonyProvider & {
  simulateQuoteExtracted(callId: string, quote: SimulatedQuote): Promise<SimulatedQuote>;
  simulateNegotiationOutcome(callId: string): Promise<{
    priceBefore: number;
    priceAfter: number;
    skillId: string;
  }>;
};

export class UnconfirmedJobSpecError extends Error {
  constructor(jobSpecId: string) {
    super(`JobSpec ${jobSpecId} must be confirmed before calls`);
    this.name = "UnconfirmedJobSpecError";
  }
}

export class CallOrchestrator {
  constructor(
    private readonly deps: {
      jobSpecRepo: JobSpecRepository;
      quoteRepo?: QuoteRepository;
      auditRepo?: AuditRepository;
      callRepo?: CallRepository;
      telephony?: SimulationTelephony;
      vendorDirectory?: VendorDirectory;
    },
  ) {}

  async startRound1(jobSpecId: string) {
    const jobSpec = await this.requireConfirmed(jobSpecId);
    const { callRepo, quoteRepo, telephony, vendorDirectory } = this.deps;

    if (!callRepo || !quoteRepo || !telephony || !vendorDirectory) {
      return { callIds: [randomUUID(), randomUUID(), randomUUID()] };
    }

    const vendors = await vendorDirectory.findVendors({
      geo: jobSpec.geo,
      jobType: jobSpec.jobType,
      limit: 3,
    });
    const callIds: string[] = [];

    for (const vendor of vendors) {
      const call = await callRepo.create({
        jobSpecId,
        vendorId: vendor.id,
        round: 1,
      });
      const simulatedCall = await telephony.startCall({
        jobSpecId,
        vendorId: vendor.id,
        round: 1,
      });
      const extracted = await telephony.simulateQuoteExtracted(simulatedCall.callId, {
        basePrice: 200,
        normalizedTotal: 200,
        pricingModel: "flat",
      });
      const fees = feesFor(jobSpec, extracted);
      const rawQuote: Quote = {
        id: call.id,
        callId: call.id,
        jobSpecId,
        vendorId: vendor.id,
        basePrice: extracted.basePrice,
        normalizedTotal: extracted.normalizedTotal,
        pricingModel: extracted.pricingModel,
        fees,
        redFlag: false,
        round: 1,
      };
      const normalized = normalizeQuote(rawQuote, jobSpec);
      const { redFlag } = evaluateRedFlags(
        normalized,
        MARKET_BENCHMARK_WEEKLY,
        BELOW_MARKET_PERCENT,
      );
      await quoteRepo.create({
        callId: normalized.callId,
        jobSpecId: normalized.jobSpecId,
        vendorId: normalized.vendorId,
        basePrice: normalized.basePrice,
        normalizedTotal: normalized.normalizedTotal,
        pricingModel: normalized.pricingModel,
        fees: normalized.fees.map(({ feeType, amount }) => ({ feeType, amount })),
        redFlag,
        round: normalized.round,
      });
      await callRepo.updateOutcome(call.id, "itemized_quote");
      await telephony.endCall(simulatedCall.callId);
      callIds.push(call.id);
    }

    return { callIds };
  }

  async runRound2(jobSpecId: string, vendorIds: string[]) {
    const jobSpec = await this.requireConfirmed(jobSpecId);
    const { auditRepo, callRepo, telephony } = this.deps;
    if (!auditRepo || !callRepo || !telephony) {
      throw new Error("Simulated negotiation dependencies are not configured");
    }

    const auditEvents: AuditEvent[] = [];
    for (const vendorId of vendorIds.slice(0, 2)) {
      const call = await callRepo.create({ jobSpecId, vendorId, round: 2 });
      const simulatedCall = await telephony.startCall({ jobSpecId, vendorId, round: 2 });
      const outcome = await telephony.simulateNegotiationOutcome(simulatedCall.callId);
      const auditEvent = await auditRepo.append({
        callId: call.id,
        skillId: outcome.skillId,
        authorizingEvidence: {
          jobSpecId,
          leverageQuoteAmount: jobSpec.leverageQuoteAmount,
        },
        priceBefore: outcome.priceBefore,
        priceAfter: outcome.priceAfter,
      });
      await callRepo.updateOutcome(call.id, "callback_commitment");
      await telephony.endCall(simulatedCall.callId);
      auditEvents.push(auditEvent);
    }

    return { auditEvents };
  }

  async runFullNegotiation(jobSpecId: string) {
    const roundOne = await this.startRound1(jobSpecId);
    const quoteRepo = this.deps.quoteRepo;
    if (!quoteRepo) {
      throw new Error("Quote repository is not configured");
    }

    const vendorIds = (await quoteRepo.listByJobSpec(jobSpecId))
      .sort((left, right) => left.normalizedTotal - right.normalizedTotal)
      .slice(0, 2)
      .map((quote) => quote.vendorId);
    const roundTwo = await this.runRound2(jobSpecId, vendorIds);

    return {
      callIds: roundOne.callIds,
      auditEvents: roundTwo.auditEvents,
    };
  }

  private async requireConfirmed(jobSpecId: string) {
    const jobSpec = await this.deps.jobSpecRepo.getById(jobSpecId);
    if (!jobSpec) throw new Error(`JobSpec not found: ${jobSpecId}`);
    if (!jobSpec.confirmed) throw new UnconfirmedJobSpecError(jobSpecId);
    return jobSpec;
  }
}

function feesFor(jobSpec: JobSpec, quote: SimulatedQuote) {
  const baseTotal =
    quote.pricingModel === "hourly_with_minimum"
      ? quote.basePrice * 4
      : quote.pricingModel === "per_sqft"
        ? quote.basePrice * jobSpec.sqft
        : quote.basePrice;
  const feeAmount = Math.max(0, quote.normalizedTotal - baseTotal);

  if (feeAmount === 0) {
    return [];
  }

  return [
    {
      id: "simulated-fee",
      quoteId: "simulated-quote",
      feeType: quote.pricingModel === "per_sqft" ? "scope_upgrade" : "trip_fee",
      amount: feeAmount,
    },
  ];
}
