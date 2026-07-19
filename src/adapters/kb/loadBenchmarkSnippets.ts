import benchmarks from "../../../config/kb/home_cleaning_benchmarks.json";

export interface BenchmarkSnippet {
  id: string;
  text: string;
  tags: string[];
  sourceUrl?: string;
  fetchedAt?: string;
}

export function loadHomeCleaningBenchmarks(): BenchmarkSnippet[] {
  return benchmarks as BenchmarkSnippet[];
}

