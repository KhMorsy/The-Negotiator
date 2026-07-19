import { randomUUID } from "node:crypto";
import type { Call, CallRepository } from "@/contracts";

export function createInMemoryCallRepository(): CallRepository {
  const store = new Map<string, Call>();

  return {
    async create(input) {
      const call: Call = {
        id: randomUUID(),
        jobSpecId: input.jobSpecId,
        vendorId: input.vendorId,
        round: input.round,
        outcome: null,
        recordingUrl: null,
      };
      store.set(call.id, call);
      return call;
    },

    async getById(id) {
      return store.get(id) ?? null;
    },

    async updateOutcome(callId, outcome) {
      const existing = store.get(callId);
      if (!existing) {
        throw new Error(`Call not found: ${callId}`);
      }
      const updated: Call = { ...existing, outcome };
      store.set(callId, updated);
      return updated;
    },

    async listByJobSpec(jobSpecId) {
      return [...store.values()].filter((c) => c.jobSpecId === jobSpecId);
    },
  };
}

