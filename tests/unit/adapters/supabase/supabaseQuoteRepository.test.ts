import { describe, expect, it } from "vitest";
import { createSupabaseQuoteRepository } from "@/adapters/persistence/supabase/supabaseQuoteRepository";
import type { SupabaseClient } from "@/adapters/persistence/supabase/types";

describe("createSupabaseQuoteRepository", () => {
  it("inserts quote + fee rows using snake_case columns", async () => {
    const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
    let feeCount = 0;

    const client: SupabaseClient = {
      from(table) {
        return {
          async insert(row) {
            inserts.push({ table, row });
            if (table === "quotes") {
              return { data: { id: "q_1", ...row }, error: null };
            }
            if (table === "quote_fees") {
              feeCount += 1;
              return { data: { id: `f_${feeCount}`, ...row }, error: null };
            }
            throw new Error(`unexpected table: ${table}`);
          },
          select() {
            throw new Error("not needed");
          },
          update() {
            throw new Error("not needed");
          },
        };
      },
    };

    const repo = createSupabaseQuoteRepository(client);
    const quote = await repo.create({
      callId: "call_1",
      jobSpecId: "js_1",
      vendorId: "v_1",
      basePrice: 200,
      normalizedTotal: 235,
      pricingModel: "flat",
      redFlag: false,
      round: 1,
      fees: [
        { feeType: "trip_fee", amount: 35 },
        { feeType: "supplies", amount: 0 },
      ],
    });

    expect(inserts[0]).toMatchObject({
      table: "quotes",
      row: {
        call_id: "call_1",
        job_spec_id: "js_1",
        vendor_id: "v_1",
        base_price: 200,
        normalized_total: 235,
        pricing_model: "flat",
        red_flag: false,
        round: 1,
      },
    });
    expect(inserts[1]).toMatchObject({
      table: "quote_fees",
      row: { quote_id: "q_1", fee_type: "trip_fee", amount: 35 },
    });
    expect(inserts[2]).toMatchObject({
      table: "quote_fees",
      row: { quote_id: "q_1", fee_type: "supplies", amount: 0 },
    });

    expect(quote).toMatchObject({
      id: "q_1",
      jobSpecId: "js_1",
      vendorId: "v_1",
    });
    expect(quote.fees).toHaveLength(2);
    expect(quote.fees[0].quoteId).toBe("q_1");
    expect(quote.fees[0].id).toBe("f_1");
  });
});

