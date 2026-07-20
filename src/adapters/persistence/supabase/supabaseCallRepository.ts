import type { CallRepository } from "@/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isNoRowsError, mapCallRow, throwOnError } from "./types";

export function createSupabaseCallRepository(
  client: SupabaseClient,
): CallRepository {
  return {
    async create(input) {
      const { data, error } = await client
        .from("calls")
        .insert({
          job_spec_id: input.jobSpecId,
          vendor_id: input.vendorId,
          round: input.round,
          outcome: null,
          recording_url: null,
        })
        .select("*")
        .single();

      throwOnError(error);
      return mapCallRow(data as Record<string, unknown>);
    },

    async getById(id) {
      const { data, error } = await client
        .from("calls")
        .select("*")
        .eq("id", id)
        .single();

      if (isNoRowsError(error)) {
        return null;
      }
      throwOnError(error);
      if (!data) {
        return null;
      }
      return mapCallRow(data as Record<string, unknown>);
    },

    async updateOutcome(callId, outcome) {
      const { data, error } = await client
        .from("calls")
        .update({ outcome })
        .eq("id", callId)
        .select("*")
        .single();

      if (isNoRowsError(error) || !data) {
        throw new Error(`Call not found: ${callId}`);
      }
      throwOnError(error);
      return mapCallRow(data as Record<string, unknown>);
    },

    async updateRecordingUrl(callId, recordingUrl) {
      const { data, error } = await client
        .from("calls")
        .update({ recording_url: recordingUrl })
        .eq("id", callId)
        .select("*")
        .single();

      if (isNoRowsError(error) || !data) {
        throw new Error(`Call not found: ${callId}`);
      }
      throwOnError(error);
      return mapCallRow(data as Record<string, unknown>);
    },

    async listByJobSpec(jobSpecId) {
      const { data, error } = await client
        .from("calls")
        .select("*")
        .eq("job_spec_id", jobSpecId)
        .order("created_at", { ascending: true });

      throwOnError(error);
      if (!data) {
        return [];
      }
      return (data as Array<Record<string, unknown>>).map(mapCallRow);
    },
  };
}
