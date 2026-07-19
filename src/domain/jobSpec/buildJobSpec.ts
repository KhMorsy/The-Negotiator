import { JobSpecSchema, type JobSpec, type JobType } from "@/contracts";
import { randomUUID } from "node:crypto";

export class JobSpecValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobSpecValidationError";
  }
}

type Defaults = { geo: string; jobType: JobType; frequency: JobSpec["frequency"] };

export function buildJobSpec(
  voicePartial: Partial<JobSpec>,
  docPartial: Partial<JobSpec>,
  defaults: Defaults,
  existingId?: string,
): JobSpec {
  const merged = {
    id: existingId ?? randomUUID(), jobType: defaults.jobType, sqft: 0,
    bedrooms: 0, bathrooms: 0, frequency: defaults.frequency, addOns: [],
    suppliesProvided: false, pets: false, accessNotes: "", conditionNotes: "",
    geo: defaults.geo, confirmed: false, ...voicePartial, ...docPartial,
  };
  const parsed = JobSpecSchema.safeParse(merged);
  if (!parsed.success) throw new JobSpecValidationError(parsed.error.message);
  if (parsed.data.sqft <= 0) throw new JobSpecValidationError("sqft must be greater than zero");
  return parsed.data;
}
