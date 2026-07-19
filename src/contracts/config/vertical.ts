import { z } from "zod";
import { JobTypeSchema } from "../schemas/job-spec";

export const VerticalConfigSchema = z
  .object({
    id: z.string(),
    displayName: z.string(),
    jobTypes: z.array(JobTypeSchema),
    redFlagRules: z
      .object({
        belowMarketPercent: z.number().int().nonnegative(),
        requireInsuredBondedWarning: z.boolean(),
        openEndedHourlyIsWarning: z.boolean(),
      })
      .strict(),
    benchmarkSources: z.array(z.string()),
    skillsSeedNote: z.string().optional(),
  })
  .strict();

export type VerticalConfig = z.infer<typeof VerticalConfigSchema>;

