import { describe, expect, it } from "vitest";
import { loadHomeCleaningBenchmarks } from "@/adapters/kb/loadBenchmarkSnippets";

describe("loadHomeCleaningBenchmarks", () => {
  it("loads at least 5 benchmark snippets", () => {
    const snippets = loadHomeCleaningBenchmarks();

    expect(snippets.length).toBeGreaterThanOrEqual(5);
    expect(snippets[0]).toMatchObject({
      id: expect.any(String),
      text: expect.any(String),
      tags: expect.any(Array),
    });
  });
});

