import type { AuditEvent, AuditRepository } from "@/contracts";
import type { SupabaseClient } from "./types";
import { mapAuditRow } from "./types";

export function createSupabaseAuditRepository(
  client: SupabaseClient,
): AuditRepository {
  return {
    async append(event) {
      const { data, error } = await client.from("audit_events").insert({
        call_id: event.callId,
        skill_id: event.skillId,
        authorizing_evidence: event.authorizingEvidence,
        price_before: event.priceBefore,
        price_after: event.priceAfter,
      });

      if (error) {
        throw new Error(error.message);
      }

      return mapAuditRow(data as Record<string, unknown>);
    },

    async listByCall(callId) {
      const { data, error } = await client
        .from("audit_events")
        .select("*")
        .eq("call_id", callId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return [];
      }

      return (data as Array<Record<string, unknown>>).map(mapAuditRow);
    },
  };
}

