import { describe, it, expect } from "vitest";
import { CONTRACTS_VERSION } from "@/contracts";

describe("bootstrap", () => {
  it("exports contracts version marker", () => {
    expect(CONTRACTS_VERSION).toBe("0.1.0");
  });
});
