import { createFakeLlmParser } from "@/adapters/fake/fakeLlmParser";
import { createFakeLlmPlanner } from "@/adapters/fake/fakeLlmPlanner";
import { createInMemoryKb } from "@/adapters/fake/inMemoryKb";
import { createInMemoryRepos } from "@/adapters/fake/inMemoryRepos";
import type { KnowledgeBase, LLMParser, LLMPlanner, Skill } from "@/contracts";
import { loadHomeCleaningSkills } from "@/domain/skills/loadSkills";

export interface AppContainer {
  repos: ReturnType<typeof createInMemoryRepos>;
  kb: KnowledgeBase;
  planner: LLMPlanner;
  parser: LLMParser;
  skills: Skill[];
}

export function createTestContainer(): AppContainer {
  return {
    repos: createInMemoryRepos(),
    kb: createInMemoryKb(),
    planner: createFakeLlmPlanner(),
    parser: createFakeLlmParser(),
    skills: loadHomeCleaningSkills(),
  };
}

