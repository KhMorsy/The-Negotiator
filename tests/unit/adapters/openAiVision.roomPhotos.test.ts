import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOpenAiVisionAdapter } from "@/adapters/llm/openAiVisionAdapter";

describe("createOpenAiVisionAdapter.parseRoomPhotos", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps OpenAI JSON response to Partial<JobSpec>", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sqft: 2100,
                  bedrooms: 4,
                  bathrooms: 2,
                  conditionNotes: "Heavy pet hair in bedrooms.",
                }),
              },
            },
          ],
        }),
      }),
    );

    const parser = createOpenAiVisionAdapter({ apiKey: "test" });
    const patch = await parser.parseRoomPhotos({
      images: [{ bytes: new Uint8Array([0xff, 0xd8]), mimeType: "image/jpeg" }],
    });

    expect(patch.sqft).toBe(2100);
    expect(patch.bedrooms).toBe(4);
    expect(patch.conditionNotes).toContain("pet hair");
  });
});
