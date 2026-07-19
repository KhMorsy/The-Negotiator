import { randomUUID } from "node:crypto";
import type { JobSpecRepository } from "@/contracts";

export class UnconfirmedJobSpecError extends Error {
  constructor(jobSpecId: string) {
    super(`JobSpec ${jobSpecId} must be confirmed before calls`);
    this.name = "UnconfirmedJobSpecError";
  }
}

export class CallOrchestrator {
  constructor(private readonly deps: { jobSpecRepo: JobSpecRepository }) {}

  async startRound1(jobSpecId: string) {
    const jobSpec = await this.deps.jobSpecRepo.getById(jobSpecId);
    if (!jobSpec) throw new Error(`JobSpec not found: ${jobSpecId}`);
    if (!jobSpec.confirmed) throw new UnconfirmedJobSpecError(jobSpecId);
    return { callIds: [randomUUID(), randomUUID(), randomUUID()] };
  }
}
