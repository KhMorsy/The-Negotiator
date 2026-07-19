import { describe, expect, it } from "vitest";
import { createSupabaseAuditRepository } from "@/adapters/persistence/supabase/supabaseAuditRepository";
import type { SupabaseClient } from "@/adapters/persistence/supabase/types";

describe("createSupabaseAuditRepository", () => {
  it("maps append input to snake_case columns", async () => {
    let insertedTable: string | null = null;
    let insertedRow: Record<string, unknown> | null = null;

    const client: SupabaseClient = {
      from(table) {
        return {
          async insert(row) {
            insertedTable = table;
            insertedRow = row;
            return {
              data: {
                id: "a_1",
                created_at: "2026-01-01T00:00:00.000Z",
                ...row,
              },
              error: null,
            };
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

    const repo = createSupabaseAuditRepository(client);
    const created = await repo.append({
      callId: "call_1",
      skillId: "challenge_trip_fee",
      authorizingEvidence: { fee: 35 },
      priceBefore: 235,
      priceAfter: null,
    });

    expect(insertedTable).toBe("audit_events");
    expect(insertedRow).toMatchObject({
      call_id: "call_1",
      skill_id: "challenge_trip_fee",
      authorizing_evidence: { fee: 35 },
      price_before: 235,
      price_after: null,
    });
    expect(created).toMatchObject({
      id: "a_1",
      callId: "call_1",
      skillId: "challenge_trip_fee",
      createdAt: "2026-01-01T00:00:00.000Z",
      priceBefore: 235,
      priceAfter: null,
    });
  });
});

