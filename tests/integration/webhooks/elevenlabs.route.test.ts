import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/webhooks/elevenlabs/route";
import type { JobSpec } from "@/contracts";

const jobSpec: JobSpec = {
  id: "job-1",
  jobType: "deep_clean",
  sqft: 1200,
  bedrooms: 2,
  bathrooms: 2,
  frequency: "once",
  addOns: [],
  suppliesProvided: false,
  pets: false,
  accessNotes: "",
  conditionNotes: "",
  geo: "Oakland, CA",
  confirmed: true,
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/webhooks/elevenlabs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/elevenlabs", () => {
  it("handles skill_tool_call", async () => {
    const response = await POST(
      makeRequest({
        type: "skill_tool_call",
        callId: "call-1",
        jobSpec,
        quotesInHand: [],
        lastVendorUtterance: "Trip fee $35",
        priceBefore: 235,
      }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.skillId).toBeTruthy();
    expect(json.eligibleSkillIds).not.toContain("leverage_competing_bid");
  });

  it("handles transcript_complete", async () => {
    const response = await POST(
      makeRequest({
        type: "transcript_complete",
        callId: "call-2",
        jobSpec,
        vendorId: "vendor-1",
        round: 1,
        transcript: {
          turns: [
            {
              role: "vendor",
              text: "We charge $200 base plus a $35 trip fee.",
            },
          ],
        },
      }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.quote.normalizedTotal).toBe(235);
  });

  it("skill tool then transcript on same call persists audit and quote", async () => {
    const skillResponse = await POST(
      makeRequest({
        type: "skill_tool_call",
        callId: "call-flow-1",
        jobSpec,
        quotesInHand: [],
        lastVendorUtterance: "Total is $280 with trip fee",
        priceBefore: 280,
      }),
    );
    expect(skillResponse.status).toBe(200);

    const quoteResponse = await POST(
      makeRequest({
        type: "transcript_complete",
        callId: "call-flow-1",
        jobSpec,
        vendorId: "vendor-1",
        round: 1,
        transcript: {
          turns: [
            {
              role: "vendor",
              text: "We charge $200 base plus a $35 trip fee.",
            },
          ],
        },
      }),
    );
    expect(quoteResponse.status).toBe(200);
    const quoteJson = await quoteResponse.json();
    expect(quoteJson.quote.normalizedTotal).toBe(235);
  });
});
