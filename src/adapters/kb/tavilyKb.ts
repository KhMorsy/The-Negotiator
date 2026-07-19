import type { KnowledgeBase } from "@/contracts";

export interface TavilySearchFn {
  (input: { query: string; maxResults: number }): Promise<
    Array<{ url: string; content: string; score: number }>
  >;
}

export function createDefaultTavilySearchFn(
  apiKey = process.env.TAVILY_API_KEY,
): TavilySearchFn {
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY required for live Tavily search");
  }

  return async ({ query, maxResults }) => {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: "basic",
        include_answer: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily search failed: ${response.status}`);
    }

    const body = (await response.json()) as {
      results?: Array<{ url?: string; content?: string; score?: number }>;
    };

    return (body.results ?? [])
      .filter((result) => Boolean(result.url) && Boolean(result.content))
      .map((result) => ({
        url: result.url as string,
        content: result.content as string,
        score: typeof result.score === "number" ? result.score : 0,
      }));
  };
}

export function createTavilyKb(options: {
  searchFn: TavilySearchFn;
  fallback: KnowledgeBase;
}): KnowledgeBase {
  return {
    async retrieve({ query, topK }) {
      try {
        const hits = await options.searchFn({ query, maxResults: topK });
        if (hits.length === 0) {
          return options.fallback.retrieve({ query, topK });
        }

        return hits
          .map((hit) => ({
            id: hit.url,
            text: hit.content,
            score: hit.score,
          }))
          .sort((left, right) => right.score - left.score)
          .slice(0, topK);
      } catch {
        return options.fallback.retrieve({ query, topK });
      }
    },
  };
}
