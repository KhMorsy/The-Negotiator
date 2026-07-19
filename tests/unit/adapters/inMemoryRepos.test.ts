import { describe, expect, it } from "vitest";
import { createInMemoryRepos } from "@/adapters/fake/inMemoryRepos";

describe("createInMemoryRepos", () => {
  it("returns all four repository ports", () => {
    const repos = createInMemoryRepos();
    expect(repos.jobSpecs).toBeDefined();
    expect(repos.calls).toBeDefined();
    expect(repos.quotes).toBeDefined();
    expect(repos.audit).toBeDefined();
  });
});

