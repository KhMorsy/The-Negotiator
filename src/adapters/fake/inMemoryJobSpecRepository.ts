import { randomUUID } from "node:crypto";
import type { JobSpec, JobSpecRepository } from "@/contracts";

export function createInMemoryJobSpecRepository(): JobSpecRepository {
  const store = new Map<string, JobSpec>();

  return {
    async create(draft) {
      const jobSpec: JobSpec = { id: randomUUID(), confirmed: false, ...draft };
      store.set(jobSpec.id, jobSpec);
      return jobSpec;
    },

    async getById(id) {
      return store.get(id) ?? null;
    },

    async confirm(id) {
      const existing = store.get(id);
      if (!existing) {
        throw new Error(`JobSpec not found: ${id}`);
      }
      const confirmed: JobSpec = { ...existing, confirmed: true };
      store.set(id, confirmed);
      return confirmed;
    },

    async updateDraft(id, patch) {
      const existing = store.get(id);
      if (!existing) {
        throw new Error(`JobSpec not found: ${id}`);
      }
      const updated: JobSpec = { ...existing, ...patch };
      store.set(id, updated);
      return updated;
    },
  };
}

