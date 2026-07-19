import { describe, expect, it } from "vitest";
import {
  createContainer,
  resolveGeneratedSkillDirectory,
} from "@/app/composition/createContainer";

describe("createContainer", () => {
  it("wires fake adapters without throwing", () => {
    const container = createContainer();

    expect(container.intakeOrchestrator).toBeDefined();
    expect(container.callOrchestrator).toBeDefined();
    expect(container.reportComposer).toBeDefined();
    expect(container.telephony).toBeDefined();
  });

  it("uses writable temporary storage for generated skills on Vercel", () => {
    expect(resolveGeneratedSkillDirectory({ VERCEL: "1" })).toBe(
      "/tmp/the-negotiator-skills",
    );
  });
});
