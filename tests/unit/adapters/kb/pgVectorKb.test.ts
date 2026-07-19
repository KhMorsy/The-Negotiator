import { describe, expect, it } from "vitest";
import { createPgVectorKb } from "@/adapters/kb/pgVectorKb";
import { loadHomeCleaningBenchmarks } from "@/adapters/kb/loadBenchmarkSnippets";

describe("createPgVectorKb", () => {
  it("delegates to injected queryFn", async () => {
    const kb = createPgVectorKb({
      queryFn: async () => [
        { id: "vec-1", text: "vector result", score: 0.99 },
      ],
    });

    const results = await kb.retrieve({ query: "trip fee", topK: 1 });
    expect(results[0].text).toBe("vector result");
  });

  it("falls back to local snippet scoring when queryFn returns empty", async () => {
    const kb = createPgVectorKb({
      queryFn: async () => [],
      fallbackSnippets: loadHomeCleaningBenchmarks(),
    });

    const results = await kb.retrieve({ query: "trip fee", topK: 2 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].text.toLowerCase()).toContain("trip");
  });
});

