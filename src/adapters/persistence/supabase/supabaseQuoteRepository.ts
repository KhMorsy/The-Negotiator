import type { Quote, QuoteFee, QuoteRepository } from "@/contracts";
import type { SupabaseClient } from "./types";
import { mapQuoteRow } from "./types";

function mapQuoteFeeRow(row: Record<string, unknown>): QuoteFee {
  return {
    id: String(row.id),
    quoteId: String(row.quote_id),
    feeType: String(row.fee_type),
    amount: Number(row.amount),
  };
}

export function createSupabaseQuoteRepository(
  client: SupabaseClient,
): QuoteRepository {
  return {
    async create(input) {
      const { data: quoteData, error: quoteError } = await client
        .from("quotes")
        .insert({
          call_id: input.callId,
          job_spec_id: input.jobSpecId,
          vendor_id: input.vendorId,
          base_price: input.basePrice,
          normalized_total: input.normalizedTotal,
          pricing_model: input.pricingModel,
          red_flag: input.redFlag,
          round: input.round,
        });

      if (quoteError) {
        throw new Error(quoteError.message);
      }

      const quoteRow = quoteData as Record<string, unknown>;
      const quoteId = String(quoteRow.id);

      const fees: QuoteFee[] = [];
      for (const fee of input.fees) {
        const { data, error } = await client.from("quote_fees").insert({
          quote_id: quoteId,
          fee_type: fee.feeType,
          amount: fee.amount,
        });

        if (error) {
          throw new Error(error.message);
        }

        fees.push(mapQuoteFeeRow(data as Record<string, unknown>));
      }

      return mapQuoteRow(quoteRow, fees);
    },

    async listByJobSpec(jobSpecId) {
      const { data, error } = await client
        .from("quotes")
        .select("*")
        .eq("job_spec_id", jobSpecId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return [];
      }

      const rows = data as Array<Record<string, unknown>>;
      const quotes: Quote[] = [];
      for (const row of rows) {
        const quoteId = String(row.id);
        const { data: feeData, error: feeError } = await client
          .from("quote_fees")
          .select("*")
          .eq("quote_id", quoteId)
          .order("id", { ascending: true });

        if (feeError) {
          throw new Error(feeError.message);
        }

        const fees = feeData
          ? (feeData as Array<Record<string, unknown>>).map(mapQuoteFeeRow)
          : [];
        quotes.push(mapQuoteRow(row, fees));
      }

      return quotes;
    },

    async getById(id) {
      const { data: quoteData, error: quoteError } = await client
        .from("quotes")
        .select("*")
        .eq("id", id)
        .single();

      if (quoteError) {
        throw new Error(quoteError.message);
      }

      if (!quoteData) {
        return null;
      }

      const { data: feeData, error: feeError } = await client
        .from("quote_fees")
        .select("*")
        .eq("quote_id", id)
        .order("id", { ascending: true });

      if (feeError) {
        throw new Error(feeError.message);
      }

      const fees = feeData
        ? (feeData as Array<Record<string, unknown>>).map(mapQuoteFeeRow)
        : [];
      return mapQuoteRow(quoteData as Record<string, unknown>, fees);
    },
  };
}

