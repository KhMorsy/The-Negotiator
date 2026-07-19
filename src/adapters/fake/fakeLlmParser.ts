import type { LLMParser } from "@/contracts";

type ParsedQuote = Awaited<ReturnType<LLMParser["extractQuoteFromTranscript"]>>;

function parseDollarAmount(text: string, label: RegExp): number | null {
  const match = text.match(label);
  if (!match) return null;

  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount : null;
}

export function createFakeLlmParser(): LLMParser {
  return {
    async extractQuoteFromTranscript({ transcript, jobSpec }) {
      const vendorText = transcript.turns
        .filter((turn) => turn.role === "vendor")
        .map((turn) => turn.text)
        .join(" ");

      const basePrice =
        parseDollarAmount(vendorText, /\$\s*(\d+(?:\.\d+)?)\s*base/i) ??
        parseDollarAmount(vendorText, /charge\s*\$\s*(\d+(?:\.\d+)?)/i) ??
        0;
      const tripFee =
        parseDollarAmount(vendorText, /(\d+(?:\.\d+)?)\s*trip fee/i) ?? 0;
      const fees = tripFee > 0 ? [{ feeType: "trip_fee", amount: tripFee }] : [];

      const parsed = {
        jobSpecId: jobSpec.id,
        vendorId: "fake-vendor-from-transcript",
        basePrice,
        normalizedTotal: basePrice + tripFee,
        pricingModel: "flat" as const,
        redFlag: false,
        round: 1 as const,
        fees,
      };

      return parsed as ParsedQuote;
    },
  };
}
