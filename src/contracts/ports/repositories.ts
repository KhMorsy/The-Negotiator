import type {
  AuditEvent,
  Call,
  CallOutcome,
  CallRound,
  JobSpec,
  Quote,
  QuoteFee,
} from "../types";

export interface JobSpecRepository {
  create(draft: Omit<JobSpec, "id" | "confirmed">): Promise<JobSpec>;
  getById(id: string): Promise<JobSpec | null>;
  confirm(id: string): Promise<JobSpec>;
  updateDraft(
    id: string,
    patch: Partial<Omit<JobSpec, "id" | "confirmed">>,
  ): Promise<JobSpec>;
}

export interface CallRepository {
  create(input: {
    jobSpecId: string;
    vendorId: string;
    round: CallRound;
  }): Promise<Call>;
  getById(id: string): Promise<Call | null>;
  updateOutcome(callId: string, outcome: CallOutcome): Promise<Call>;
  updateRecordingUrl(callId: string, recordingUrl: string): Promise<Call>;
  listByJobSpec(jobSpecId: string): Promise<Call[]>;
}

export interface QuoteRepository {
  create(
    input: Omit<Quote, "id" | "fees"> & {
      fees: Omit<QuoteFee, "id" | "quoteId">[];
    },
  ): Promise<Quote>;
  listByJobSpec(jobSpecId: string): Promise<Quote[]>;
  getById(id: string): Promise<Quote | null>;
}

export interface AuditRepository {
  append(event: Omit<AuditEvent, "id" | "createdAt">): Promise<AuditEvent>;
  listByCall(callId: string): Promise<AuditEvent[]>;
}
