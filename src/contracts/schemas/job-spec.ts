import { z } from "zod";
import type { JobSpec } from "../types";

export const JobTypeSchema = z.enum([
  "recurring_weekly",
  "recurring_biweekly",
  "recurring_monthly",
  "deep_clean",
  "move_out",
  "post_renovation",
  "turnover",
]);

export const JobSpecSchema = z
  .object({
    id: z.string(),
    jobType: JobTypeSchema,
    sqft: z.number().int().nonnegative(),
    bedrooms: z.number().int().nonnegative(),
    bathrooms: z.number().int().nonnegative(),
    frequency: z.enum(["once", "weekly", "biweekly", "monthly"]),
    addOns: z.array(z.string()),
    suppliesProvided: z.boolean(),
    pets: z.boolean(),
    accessNotes: z.string(),
    conditionNotes: z.string(),
    geo: z.string(),
    confirmed: z.boolean(),
    leverageQuoteAmount: z.number().optional(),
  })
  .strict();

export function parseJobSpec(input: unknown): JobSpec {
  return JobSpecSchema.parse(input);
}

