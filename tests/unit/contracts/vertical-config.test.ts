import { describe, expect, it } from "vitest";
import { VerticalConfigSchema } from "@/contracts/config/vertical";
import homeCleaning from "../../../config/verticals/home_cleaning.json";

describe("VerticalConfigSchema", () => {
  it("parses the home_cleaning vertical config", () => {
    const result = VerticalConfigSchema.safeParse(homeCleaning);
    expect(result.success).toBe(true);
    expect(result.success && result.data.id).toBe("home_cleaning");
  });
});

