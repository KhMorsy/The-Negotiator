import type { CatalogSkill } from "../types";

export interface SkillRepository {
  listGenerated(): Promise<CatalogSkill[]>;
  saveGenerated(skill: CatalogSkill): Promise<CatalogSkill>;
}
