import { beforeEach, describe, expect, it } from "vitest";
import type { KnowledgeBase } from "@/contracts";

export function knowledgeBaseContract(
  name: string,
  factory: () => KnowledgeBase,
) {
  describe(`KnowledgeBase contract: ${name}`, () => {
    let kb: KnowledgeBase;

    beforeEach(() => {
      kb = factory();
    });

    it("retrieve returns at most topK results sorted by score desc", async () => {
      const results = await kb.retrieve({
        query: "trip fee Oakland deep clean",
        topK: 3,
      });

      expect(results.length).toBeLessThanOrEqual(3);
      for (let index = 1; index < results.length; index += 1) {
        expect(results[index - 1].score).toBeGreaterThanOrEqual(
          results[index].score,
        );
      }
      results.forEach((result) => {
        expect(result.id).toBeTruthy();
        expect(result.text).toBeTruthy();
        expect(result.score).toBeGreaterThanOrEqual(0);
      });
    });

    it("retrieve returns empty array for unrelated query when no overlap", async () => {
      const results = await kb.retrieve({
        query: "xyzzy_plugh_no_match_token",
        topK: 5,
      });
      expect(results).toEqual([]);
    });
  });
}

import { createInMemoryKb } from "@/adapters/fake/inMemoryKb";
import { loadHomeCleaningBenchmarks } from "@/adapters/kb/loadBenchmarkSnippets";
import { createPgVectorKb } from "@/adapters/kb/pgVectorKb";
import { createTavilyKb } from "@/adapters/kb/tavilyKb";

knowledgeBaseContract("in-memory", () =>
  createInMemoryKb(loadHomeCleaningBenchmarks()),
);

knowledgeBaseContract("pgvector-stub-fallback", () =>
  createPgVectorKb({
    queryFn: async () => [],
    fallbackSnippets: loadHomeCleaningBenchmarks(),
  }),
);

knowledgeBaseContract("tavily-fake-fetch", () =>
  createTavilyKb({
    searchFn: async ({ query }) => {
      if (query.includes("xyzzy_plugh_no_match_token")) {
        return [];
      }
      return [
        {
          url: "https://example.com/trip-fee",
          content: "Typical trip fee Oakland deep clean is $30–$45.",
          score: 0.95,
        },
        {
          url: "https://example.com/deep-clean",
          content: "Oakland deep clean market rates vary by sqft.",
          score: 0.8,
        },
        {
          url: "https://example.com/fees",
          content: "Travel and trip fees are often waivable on recurring plans.",
          score: 0.7,
        },
      ];
    },
    fallback: createInMemoryKb(loadHomeCleaningBenchmarks()),
  }),
);
