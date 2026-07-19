import { z } from "zod";

export const SkillPreconditionsSchema = z.object({
  requiresCompetingQuote: z.boolean().optional(),
  requiresRecurringJob: z.boolean().optional(),
  minQuotesInHand: z.number().int().min(0).optional(),
});

export const SkillSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(3),
  selectionSignals: z.array(z.string()).min(1),
  preconditions: SkillPreconditionsSchema,
  moveTemplate: z.string().min(10),
});

export const SkillCategorySchema = z.enum([
  "fee_challenges",
  "commitment_leverage",
  "market_leverage",
  "clarification",
  "trust_verification",
  "timing_flexibility",
]);

export const CatalogSkillSchema = SkillSchema.extend({
  category: SkillCategorySchema,
  avoidWhen: z.string().min(1).optional(),
});
