import { describe, expect, it } from "vitest";
import { createSupabaseCallRepository } from "@/adapters/persistence/supabase/supabaseCallRepository";
import type { SupabaseClient } from "@/adapters/persistence/supabase/types";

describe("createSupabaseCallRepository", () => {
  it("maps create input to snake_case columns", async () => {
    let insertedTable: string | null = null;
    let insertedRow: Record<string, unknown> | null = null;

    const client: SupabaseClient = {
      from(table) {
        return {
          async insert(row) {
            insertedTable = table;
            insertedRow = row;
            return { data: { id: "c_1", ...row }, error: null };
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

    const repo = createSupabaseCallRepository(client);
    const created = await repo.create({
      jobSpecId: "js_1",
      vendorId: "v_1",
      round: 1,
    });

    expect(insertedTable).toBe("calls");
    expect(insertedRow).toMatchObject({
      job_spec_id: "js_1",
      vendor_id: "v_1",
      round: 1,
      outcome: null,
      recording_url: null,
    });
    expect(created).toMatchObject({
      id: "c_1",
      jobSpecId: "js_1",
      vendorId: "v_1",
      round: 1,
      outcome: null,
      recordingUrl: null,
    });
  });
});

