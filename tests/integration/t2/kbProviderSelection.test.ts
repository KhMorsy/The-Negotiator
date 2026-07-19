import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createContainer,
  resetContainerForTests,
} from "@/app/composition/createContainer";

describe("KB provider selection", () => {
  beforeEach(() => resetContainerForTests());

  afterEach(() => {
    delete process.env.KB_PROVIDER;
    delete process.env.TAVILY_API_KEY;
    resetContainerForTests();
  });

  it("defaults to snippet KB when KB_PROVIDER unset", () => {
    expect(createContainer().kbProviderKind).toBe("snippets");
  });

  it("selects Tavily when KB_PROVIDER=tavily and key is present", () => {
    process.env.KB_PROVIDER = "tavily";
    process.env.TAVILY_API_KEY = "tvly-test";

    expect(createContainer().kbProviderKind).toBe("tavily");
  });

  it("falls back to snippets when KB_PROVIDER=tavily but key missing", () => {
    process.env.KB_PROVIDER = "tavily";
    delete process.env.TAVILY_API_KEY;

    expect(createContainer().kbProviderKind).toBe("snippets");
  });
});
