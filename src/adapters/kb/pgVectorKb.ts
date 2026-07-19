import type { KnowledgeBase } from "@/contracts";
import {
  loadHomeCleaningBenchmarks,
  type BenchmarkSnippet,
} from "./loadBenchmarkSnippets";
import { scoreSnippets } from "./scoreSnippets";

export interface PgVectorQueryFn {
  (input: { query: string; topK: number }): Promise<
    Array<{ id: string; text: string; score: number }>
  >;
}

export function createPgVectorKb(options: {
  queryFn: PgVectorQueryFn;
  fallbackSnippets?: BenchmarkSnippet[];
}): KnowledgeBase {
  const fallback = options.fallbackSnippets ?? loadHomeCleaningBenchmarks();

  return {
    async retrieve({ query, topK }) {
      const vectorHits = await options.queryFn({ query, topK });
      if (vectorHits.length > 0) {
        return vectorHits.slice(0, topK);
      }

      return scoreSnippets(fallback, query, topK);
    },
  };
}

export function createDefaultPgVectorQueryFn(): PgVectorQueryFn {
  return async () => [];
}

