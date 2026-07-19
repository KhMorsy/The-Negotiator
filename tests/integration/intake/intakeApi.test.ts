// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST as startPost } from "@/app/api/intake/start/route";
import { POST as uploadPost } from "@/app/api/intake/upload-quote/route";

describe("intake API routes", () => {
  it("starts an intake session", async () => {
    const response = await startPost(new Request("http://localhost/api/intake/start", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ geo: "Austin, TX" }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ jobSpecId: expect.any(String), sessionId: expect.stringMatching(/^fake-session-/) });
  });

  it("uploads a quote and applies leverage", async () => {
    const started = await startPost(new Request("http://localhost/api/intake/start", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ geo: "Austin, TX" }),
    }));
    const { jobSpecId } = await started.json();
    const form = new FormData();
    form.append("jobSpecId", jobSpecId);
    form.append("file", new Blob([new Uint8Array([1])], { type: "application/pdf" }), "quote.pdf");
    const response = await uploadPost(new Request("http://localhost/api/intake/upload-quote", { method: "POST", body: form }));
    expect(response.status).toBe(200);
    expect((await response.json()).jobSpec.leverageQuoteAmount).toBe(185);
  });
});
