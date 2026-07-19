import { describe, expect, it } from "vitest";
import type { CatalogSkill } from "@/domain/skills/catalogTypes";
import { validateCatalog } from "@/domain/skills/validateCatalog";

const cleanSkill: CatalogSkill = {
  id: "challenge_trip_fee",
  name: "Challenge trip fee",
  category: "fee_challenges",
  selectionSignals: ["trip fee", "travel charge"],
  preconditions: {},
  moveTemplate: "Can you reduce the {{feeType}} of ${{feeAmount}}?",
};

describe("validateCatalog", () => {
  it("returns violations for every invalid catalog rule", () => {
    const violations = validateCatalog([
      cleanSkill,
      { ...cleanSkill },
      { ...cleanSkill, id: "ask_bad_leverage", moveTemplate: "Can you beat their price?" },
      { ...cleanSkill, id: "challenge_long", moveTemplate: "Can you reduce this fee? " + "x".repeat(201) },
      { ...cleanSkill, id: "ask_unknown_variable", moveTemplate: "Can you reduce {{unknown}}?" },
      { ...cleanSkill, id: "ask_wrong_category", category: "fee_challenges", preconditions: { requiresRecurringJob: true } },
    ]);

    expect(violations.map((violation) => violation.rule)).toEqual(
      expect.arrayContaining([
        "ids/unique",
        "honesty/leverage-requires-quote",
        "move-template/single-sentence-max-length",
        "template-variables/allowed-set",
        "recurring/category",
        "category/minimum-balance",
        "catalog/minimum-total",
      ]),
    );
  });

  it("accepts a clean balanced catalog", () => {
    const categories: CatalogSkill["category"][] = ["fee_challenges", "commitment_leverage", "market_leverage", "clarification", "trust_verification", "timing_flexibility"];
    const catalog = categories.flatMap((category) => Array.from({ length: 9 }, (_, index) => ({
      ...cleanSkill,
      id: `challenge_${category}_${index}`,
      category,
      preconditions: category === "market_leverage" ? { requiresCompetingQuote: true } : {},
      moveTemplate: category === "market_leverage" ? "Can you match the written quote of ${{competingTotal}}?" : cleanSkill.moveTemplate,
    })));

    expect(validateCatalog(catalog)).toEqual([]);
  });
});
