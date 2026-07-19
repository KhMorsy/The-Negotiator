import type { KnowledgeBase } from "@/contracts";
import type { BenchmarkSnippet } from "./loadBenchmarkSnippets";

type KnowledgeBaseResult = Awaited<ReturnType<KnowledgeBase["retrieve"]>>[number];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function scoreSnippets(
  snippets: BenchmarkSnippet[],
  query: string,
  topK: number,
): KnowledgeBaseResult[] {
  const queryTokens = new Set(tokenize(query));

  return snippets
    .map((snippet) => {
      const haystack = tokenize(`${snippet.text} ${snippet.tags.join(" ")}`);
      let overlap = 0;
      for (const token of haystack) {
        if (queryTokens.has(token)) overlap += 1;
      }

      return {
        id: snippet.id,
        text: snippet.text,
        score: haystack.length === 0 ? 0 : overlap / haystack.length,
      };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, topK);
}

