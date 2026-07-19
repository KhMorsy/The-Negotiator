import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("frontend architecture", () => {
  it("passes dependency-cruiser frontend rules", () => {
    const output = execSync("npm run arch:check", { encoding: "utf8" });
    expect(output).toMatch(/no dependency violations/i);
  });
});
