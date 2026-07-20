import { describe, expect, it } from "vitest";
import { createSupabaseCallRepository } from "@/adapters/persistence/supabase/supabaseCallRepository";
import { createInsertSelectMock } from "./mockSupabaseClient";

describe("createSupabaseCallRepository", () => {
  it("maps create input to snake_case columns", async () => {
    let insertedTable: string | null = null;
    let insertedRow: Record<string, unknown> | null = null;

    const client = createInsertSelectMock({
      onInsert(table, row) {
        insertedTable = table;
        insertedRow = row;
        return { id: "c_1", ...row };
      },
    });

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

  it("maps recording URL updates to snake_case columns", async () => {
    let updatedRow: Record<string, unknown> | null = null;

    const client = createInsertSelectMock({
      onUpdate(_table, row, id) {
        updatedRow = row;
        return {
          id,
          job_spec_id: "js_1",
          vendor_id: "v_1",
          round: 1,
          outcome: null,
          ...row,
        };
      },
    });

    const updated = await createSupabaseCallRepository(client).updateRecordingUrl(
      "c_1",
      "https://storage.example/recordings/c_1.mp3",
    );

    expect(updatedRow).toEqual({
      recording_url: "https://storage.example/recordings/c_1.mp3",
    });
    expect(updated.recordingUrl).toBe(
      "https://storage.example/recordings/c_1.mp3",
    );
  });
});
