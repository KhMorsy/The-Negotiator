import { describe, expect, it, vi } from "vitest";
import { createInMemoryKb } from "@/adapters/fake/inMemoryKb";
import { loadHomeCleaningBenchmarks } from "@/adapters/kb/loadBenchmarkSnippets";
import { createTavilyKb } from "@/adapters/kb/tavilyKb";

describe("createTavilyKb", () => {
  const fallback = createInMemoryKb(loadHomeCleaningBenchmarks());

  it("maps Tavily results to KnowledgeBaseResult shape capped at topK", async () => {
    const searchFn = vi.fn().mockResolvedValue([
      { url: "https://a.example/1", content: "trip fee $30", score: 0.9 },
      { url: "https://a.example/2", content: "trip fee $40", score: 0.8 },
      { url: "https://a.example/3", content: "trip fee $50", score: 0.7 },
    ]);

    const kb = createTavilyKb({ searchFn, fallback });
    const results = await kb.retrieve({ query: "trip fee", topK: 2 });

    expect(searchFn).toHaveBeenCalledWith({ query: "trip fee", maxResults: 2 });
    expect(results).toEqual([
      { id: "https://a.example/1", text: "trip fee $30", score: 0.9 },
      { id: "https://a.example/2", text: "trip fee $40", score: 0.8 },
    ]);
  });

  it("falls back when searchFn returns an empty list", async () => {
    const kb = createTavilyKb({
      searchFn: async () => [],
      fallback,
    });

    const results = await kb.retrieve({
      query: "trip fee Oakland deep clean",
      topK: 3,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toMatch(/^bench-/);
  });

  it("falls back when searchFn throws", async () => {
    const kb = createTavilyKb({
      searchFn: async () => {
        throw new Error("network down");
      },
      fallback,
    });

    const results = await kb.retrieve({
      query: "trip fee Oakland deep clean",
      topK: 3,
    });

    expect(results.length).toBeGreaterThan(0);
  });
});
