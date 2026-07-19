import { describe, expect, it } from "vitest";
import { createFakeDocumentParser } from "@/adapters/fake/fakeDocumentParser";

describe("createFakeDocumentParser.parseRoomPhotos", () => {
  it("returns partial JobSpec with sqft and conditionNotes", async () => {
    const parser = createFakeDocumentParser();
    const patch = await parser.parseRoomPhotos({
      images: [{ bytes: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" }],
    });
    expect(patch.sqft).toBe(1850);
    expect(patch.bedrooms).toBe(3);
    expect(patch.conditionNotes).toMatch(/living room/i);
  });
});
