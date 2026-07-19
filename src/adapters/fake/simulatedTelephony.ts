import type { PricingModel, TelephonyProvider } from "@/contracts";

export type SimulatedQuote = {
  basePrice: number;
  normalizedTotal: number;
  pricingModel: PricingModel;
};

type Persona = {
  round1Total: number;
  round2Total: number;
  pricingModel: PricingModel;
  basePrice: number;
};

const personas: Record<string, Persona> = {
  "vendor-tough": {
    round1Total: 225,
    round2Total: 195,
    pricingModel: "flat",
    basePrice: 210,
  },
  "vendor-lowball": {
    round1Total: 155,
    round2Total: 140,
    pricingModel: "hourly_with_minimum",
    basePrice: 45,
  },
  "vendor-upseller": {
    round1Total: 330,
    round2Total: 295,
    pricingModel: "per_sqft",
    basePrice: 0.14,
  },
};

export type SimulatedCallAdapter = TelephonyProvider & {
  simulateQuoteExtracted: (
    callId: string,
    quote: SimulatedQuote,
  ) => Promise<SimulatedQuote>;
  simulateNegotiationOutcome: (callId: string) => Promise<{
    priceBefore: number;
    priceAfter: number;
    skillId: string;
  }>;
};

export function createSimulatedCallAdapter(): SimulatedCallAdapter {
  const calls = new Map<
    string,
    {
      vendorId: string;
      round: 1 | 2;
      jobSpecId: string;
      quote?: SimulatedQuote;
    }
  >();
  let sequence = 0;

  return {
    async startCall(input) {
      const callId = `sim-call-${++sequence}`;
      calls.set(callId, { ...input });
      return { callId };
    },

    async endCall(callId) {
      calls.delete(callId);
    },

    async simulateQuoteExtracted(callId, quote) {
      const call = calls.get(callId);
      if (!call) {
        throw new Error(`Unknown call: ${callId}`);
      }

      const persona = personas[call.vendorId];
      const resolved = persona
        ? {
            basePrice: persona.basePrice,
            normalizedTotal: persona.round1Total,
            pricingModel: persona.pricingModel,
          }
        : quote;
      call.quote = resolved;
      return resolved;
    },

    async simulateNegotiationOutcome(callId) {
      const call = calls.get(callId);
      if (!call) {
        throw new Error(`Unknown call: ${callId}`);
      }

      const persona = personas[call.vendorId] ?? {
        round1Total: 200,
        round2Total: 180,
        pricingModel: "flat" as const,
        basePrice: 200,
      };
      return {
        priceBefore: persona.round1Total,
        priceAfter: persona.round2Total,
        skillId: "leverage_competing_bid",
      };
    },
  };
}

