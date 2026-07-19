import type { DocumentParser, JobSpec } from "@/contracts";

export function createOpenAiVisionAdapter(options: {
  apiKey: string;
}): DocumentParser {
  const apiKey = options.apiKey;

  return {
    async parseExistingQuote() {
      throw new Error("OpenAI vision quote parsing not implemented in B8");
    },

    async parseRoomPhotos(input) {
      const imageParts = input.images.map((img) => ({
        type: "image_url" as const,
        image_url: {
          url: `data:${img.mimeType};base64,${Buffer.from(img.bytes).toString("base64")}`,
        },
      }));

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Estimate home cleaning job spec fields: sqft, bedrooms, bathrooms, conditionNotes, addOns. Return JSON only.",
                },
                ...imageParts,
              ],
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI vision failed: ${response.status}`);
      }

      const body = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      const content = body.choices[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI vision returned empty content");
      }
      return JSON.parse(content) as Partial<JobSpec>;
    },
  };
}
