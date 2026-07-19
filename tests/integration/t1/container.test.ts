import { describe, expect, it } from "vitest";
import { createContainer } from "@/app/composition/createContainer";

describe("createContainer", () => {
  it("wires fake adapters without throwing", () => {
    const container = createContainer();

    expect(container.intakeOrchestrator).toBeDefined();
    expect(container.callOrchestrator).toBeDefined();
    expect(container.reportComposer).toBeDefined();
    expect(container.telephony).toBeDefined();
  });
});

