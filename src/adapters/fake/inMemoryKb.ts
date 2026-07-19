import type { KnowledgeBase } from "@/contracts";
import {
  loadHomeCleaningBenchmarks,
  type BenchmarkSnippet,
} from "@/adapters/kb/loadBenchmarkSnippets";
import { scoreSnippets } from "@/adapters/kb/scoreSnippets";

export function createInMemoryKb(
  snippets: BenchmarkSnippet[] = loadHomeCleaningBenchmarks(),
): KnowledgeBase {
  return {
    async retrieve({ query, topK }) {
      return scoreSnippets(snippets, query, topK);
    },
  };
}

