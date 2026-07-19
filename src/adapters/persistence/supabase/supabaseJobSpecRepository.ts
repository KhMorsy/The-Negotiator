import type { JobSpecRepository } from "@/contracts";
import type { SupabaseClient } from "./types";
import { mapJobSpecRow } from "./types";

export function createSupabaseJobSpecRepository(
  client: SupabaseClient,
): JobSpecRepository {
  return {
    async create(draft) {
      const { data, error } = await client.from("job_specs").insert({
        job_type: draft.jobType,
        sqft: draft.sqft,
        bedrooms: draft.bedrooms,
        bathrooms: draft.bathrooms,
        frequency: draft.frequency,
        add_ons: draft.addOns,
        supplies_provided: draft.suppliesProvided,
        pets: draft.pets,
        access_notes: draft.accessNotes,
        condition_notes: draft.conditionNotes,
        geo: draft.geo,
        confirmed: false,
        leverage_quote_amount: draft.leverageQuoteAmount ?? null,
      });

      if (error) {
        throw new Error(error.message);
      }

      return mapJobSpecRow(data as Record<string, unknown>);
    },

    async getById(id) {
      const { data, error } = await client
        .from("job_specs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      return mapJobSpecRow(data as Record<string, unknown>);
    },

    async confirm(id) {
      const { data, error } = await client
        .from("job_specs")
        .update({ confirmed: true })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error(`JobSpec not found: ${id}`);
      }

      return mapJobSpecRow(data as Record<string, unknown>);
    },

    async updateDraft(id, patch) {
      const update: Record<string, unknown> = {};

      if (patch.jobType !== undefined) update.job_type = patch.jobType;
      if (patch.sqft !== undefined) update.sqft = patch.sqft;
      if (patch.bedrooms !== undefined) update.bedrooms = patch.bedrooms;
      if (patch.bathrooms !== undefined) update.bathrooms = patch.bathrooms;
      if (patch.frequency !== undefined) update.frequency = patch.frequency;
      if (patch.addOns !== undefined) update.add_ons = patch.addOns;
      if (patch.suppliesProvided !== undefined)
        update.supplies_provided = patch.suppliesProvided;
      if (patch.pets !== undefined) update.pets = patch.pets;
      if (patch.accessNotes !== undefined) update.access_notes = patch.accessNotes;
      if (patch.conditionNotes !== undefined)
        update.condition_notes = patch.conditionNotes;
      if (patch.geo !== undefined) update.geo = patch.geo;
      if (patch.leverageQuoteAmount !== undefined)
        update.leverage_quote_amount = patch.leverageQuoteAmount ?? null;

      const { data, error } = await client
        .from("job_specs")
        .update(update)
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error(`JobSpec not found: ${id}`);
      }

      return mapJobSpecRow(data as Record<string, unknown>);
    },
  };
}
