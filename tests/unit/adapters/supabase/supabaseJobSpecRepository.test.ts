import { describe, expect, it } from "vitest";
import { createSupabaseJobSpecRepository } from "@/adapters/persistence/supabase/supabaseJobSpecRepository";
import { createInsertSelectMock } from "./mockSupabaseClient";

describe("createSupabaseJobSpecRepository", () => {
  it("maps draft fields to snake_case columns", async () => {
    let insertedTable: string | null = null;
    let insertedRow: Record<string, unknown> | null = null;

    const client = createInsertSelectMock({
      onInsert(table, row) {
        insertedTable = table;
        insertedRow = row;
        return { id: "js_1", ...row };
      },
    });

    const repo = createSupabaseJobSpecRepository(client);
    const created = await repo.create({
      jobType: "deep_clean",
      sqft: 1200,
      bedrooms: 2,
      bathrooms: 2,
      frequency: "once",
      addOns: ["inside_fridge"],
      suppliesProvided: false,
      pets: true,
      accessNotes: "Gate code 1234",
      conditionNotes: "Kitchen grease buildup",
      geo: "San Francisco, CA",
      leverageQuoteAmount: 235,
    });

    expect(insertedTable).toBe("job_specs");
    expect(insertedRow).toMatchObject({
      job_type: "deep_clean",
      add_ons: ["inside_fridge"],
      supplies_provided: false,
      access_notes: "Gate code 1234",
      condition_notes: "Kitchen grease buildup",
      confirmed: false,
      leverage_quote_amount: 235,
    });
    expect(created).toMatchObject({
      id: "js_1",
      jobType: "deep_clean",
      confirmed: false,
      geo: "San Francisco, CA",
      leverageQuoteAmount: 235,
    });
  });
});
