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

  it("accepts optional provenance fields when present", () => {
    const withProvenance = [
      ...loadHomeCleaningBenchmarks(),
      {
        id: "bench-with-source",
        text: "Cited benchmark text.",
        tags: ["benchmark"],
        sourceUrl: "https://example.com/source",
        fetchedAt: "2026-07-19T00:00:00.000Z",
      },
    ];

    expect(withProvenance.at(-1)).toMatchObject({
      sourceUrl: "https://example.com/source",
      fetchedAt: "2026-07-19T00:00:00.000Z",
    });
  });
});

