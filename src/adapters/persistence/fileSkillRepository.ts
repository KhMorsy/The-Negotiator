import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CatalogSkillSchema } from "@/contracts";
import type { CatalogSkill, SkillRepository } from "@/contracts";

export function createFileSkillRepository(generatedDir: string): SkillRepository {
  if (!existsSync(generatedDir)) mkdirSync(generatedDir, { recursive: true });
  return {
    async listGenerated() {
      return readdirSync(generatedDir).filter((file) => file.endsWith(".json")).map((file) => CatalogSkillSchema.parse(JSON.parse(readFileSync(join(generatedDir, file), "utf8"))) as CatalogSkill);
    },
    async saveGenerated(skill) {
      const valid = CatalogSkillSchema.parse(skill) as CatalogSkill;
      writeFileSync(join(generatedDir, `${valid.id}.json`), JSON.stringify(valid, null, 2));
      return valid;
    },
  };
}
