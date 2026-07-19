import { describe, expect, it } from "vitest";
import { createFakeDocumentParser } from "@/adapters/fake/fakeDocumentParser";

describe("createFakeDocumentParser", () => {
  it("parseExistingQuote returns leverage amount", async () => {
    const parser = createFakeDocumentParser();
    const result = await parser.parseExistingQuote({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: "application/pdf",
    });
    expect(result.leverageQuote?.amount).toBe(185);
    expect(result.sqft).toBe(1800);
  });
});
