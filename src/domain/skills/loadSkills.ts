import skillsJson from "../../../config/skills/home_cleaning_skills.json";
import type { Skill } from "@/contracts";

export function loadHomeCleaningSkills(): Skill[] {
  return skillsJson as Skill[];
}
