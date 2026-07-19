import { describe, expect, it } from "vitest";
import { CatalogSkillSchema } from "@/contracts/schemas/skill";

describe("CatalogSkillSchema", () => {
  it("parses a generated catalog skill with a category", () => {
    expect(
      CatalogSkillSchema.parse({
        id: "ask_pet_fee_waiver",
        name: "Pet fee waiver",
        category: "commitment_leverage",
        selectionSignals: ["pet fee", "pet surcharge"],
        preconditions: { requiresRecurringJob: true },
        moveTemplate: "Can you waive the pet fee for recurring service?",
      }),
    ).toMatchObject({ category: "commitment_leverage" });
  });
});
