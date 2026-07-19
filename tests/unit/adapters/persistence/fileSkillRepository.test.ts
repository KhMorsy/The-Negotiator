import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFileSkillRepository } from "@/adapters/persistence/fileSkillRepository";

describe("createFileSkillRepository", () => {
  it("persists a generated catalog skill", async () => {
    const repo = createFileSkillRepository(mkdtempSync(join(tmpdir(), "skills-")));
    await repo.saveGenerated({ id: "ask_pet_fee_waiver", name: "Pet fee waiver", category: "commitment_leverage", selectionSignals: ["pet fee", "pet surcharge"], preconditions: {}, moveTemplate: "Can you waive the pet fee for recurring service?" });
    await expect(repo.listGenerated()).resolves.toHaveLength(1);
  });
});
