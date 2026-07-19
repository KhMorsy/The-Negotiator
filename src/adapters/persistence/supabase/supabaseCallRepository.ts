import type { CallRepository } from "@/contracts";
import type { SupabaseClient } from "./types";
import { mapCallRow } from "./types";

export function createSupabaseCallRepository(client: SupabaseClient): CallRepository {
  return {
    async create(input) {
      const { data, error } = await client.from("calls").insert({
        job_spec_id: input.jobSpecId,
        vendor_id: input.vendorId,
        round: input.round,
        outcome: null,
        recording_url: null,
      });

      if (error) {
        throw new Error(error.message);
      }

      return mapCallRow(data as Record<string, unknown>);
    },

    async getById(id) {
      const { data, error } = await client
        .from("calls")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      return mapCallRow(data as Record<string, unknown>);
    },

    async updateOutcome(callId, outcome) {
      const { data, error } = await client
        .from("calls")
        .update({ outcome })
        .eq("id", callId);

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error(`Call not found: ${callId}`);
      }

      return mapCallRow(data as Record<string, unknown>);
    },

    async listByJobSpec(jobSpecId) {
      const { data, error } = await client
        .from("calls")
        .select("*")
        .eq("job_spec_id", jobSpecId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return [];
      }

      return (data as Array<Record<string, unknown>>).map(mapCallRow);
    },
  };
}
