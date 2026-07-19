import { describe, expect, it } from "vitest";
import { createTestContainer } from "@/app/composition/createTestContainer";

describe("createTestContainer", () => {
  it("wires fake repos, kb, planner, parser, and 12 skills", () => {
    const container = createTestContainer();

    expect(container.repos.jobSpecs).toBeDefined();
    expect(container.kb).toBeDefined();
    expect(container.planner).toBeDefined();
    expect(container.parser).toBeDefined();
    expect(container.skills.length).toBe(12);
  });
});

