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

knowledgeBaseContract("in-memory", () =>
  createInMemoryKb(loadHomeCleaningBenchmarks()),
);

