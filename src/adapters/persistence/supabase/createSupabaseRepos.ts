import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAuditRepository } from "./supabaseAuditRepository";
import { createSupabaseCallRepository } from "./supabaseCallRepository";
import { createSupabaseJobSpecRepository } from "./supabaseJobSpecRepository";
import { createSupabaseQuoteRepository } from "./supabaseQuoteRepository";

export function createSupabaseRepos(client: SupabaseClient) {
  return {
    jobSpecs: createSupabaseJobSpecRepository(client),
    calls: createSupabaseCallRepository(client),
    quotes: createSupabaseQuoteRepository(client),
    audit: createSupabaseAuditRepository(client),
  };
}
