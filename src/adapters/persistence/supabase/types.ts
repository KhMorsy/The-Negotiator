import type { AuditEvent, Call, JobSpec, Quote, QuoteFee } from "@/contracts";

export function mapJobSpecRow(row: Record<string, unknown>): JobSpec {
  return {
    id: String(row.id),
    jobType: row.job_type as JobSpec["jobType"],
    sqft: Number(row.sqft),
    bedrooms: Number(row.bedrooms),
    bathrooms: Number(row.bathrooms),
    frequency: row.frequency as JobSpec["frequency"],
    addOns: row.add_ons as string[],
    suppliesProvided: Boolean(row.supplies_provided),
    pets: Boolean(row.pets),
    accessNotes: String(row.access_notes ?? ""),
    conditionNotes: String(row.condition_notes ?? ""),
    geo: String(row.geo),
    confirmed: Boolean(row.confirmed),
    leverageQuoteAmount:
      row.leverage_quote_amount == null
        ? undefined
        : Number(row.leverage_quote_amount),
  };
}

export function mapCallRow(row: Record<string, unknown>): Call {
  return {
    id: String(row.id),
    jobSpecId: String(row.job_spec_id),
    vendorId: String(row.vendor_id),
    round: Number(row.round) as Call["round"],
    outcome: (row.outcome as Call["outcome"]) ?? null,
    recordingUrl: row.recording_url == null ? null : String(row.recording_url),
  };
}

export function mapQuoteRow(row: Record<string, unknown>, fees: QuoteFee[]): Quote {
  return {
    id: String(row.id),
    callId: String(row.call_id),
    jobSpecId: String(row.job_spec_id),
    vendorId: String(row.vendor_id),
    basePrice: Number(row.base_price),
    normalizedTotal: Number(row.normalized_total),
    pricingModel: row.pricing_model as Quote["pricingModel"],
    redFlag: Boolean(row.red_flag),
    round: Number(row.round) as Quote["round"],
    fees,
  };
}

export function mapAuditRow(row: Record<string, unknown>): AuditEvent {
  return {
    id: String(row.id),
    callId: String(row.call_id),
    skillId: String(row.skill_id),
    authorizingEvidence: row.authorizing_evidence as Record<string, unknown>,
    priceBefore: row.price_before == null ? null : Number(row.price_before),
    priceAfter: row.price_after == null ? null : Number(row.price_after),
    createdAt: String(row.created_at),
  };
}

/** PostgREST / Supabase: .single() when zero rows. */
export function isNoRowsError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST116") return true;
  const message = error.message ?? "";
  return message.includes("0 rows") || message.includes("Multiple rows");
}

export function throwOnError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}
