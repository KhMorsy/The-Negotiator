import { describe, expect, it } from "vitest";
import { createFakeDocumentParser } from "@/adapters/fake/fakeDocumentParser";
import { createFakeSpeechAgent } from "@/adapters/fake/fakeSpeechAgent";
import { createInMemoryJobSpecRepository } from "@/adapters/fake/inMemoryRepos";
import { DocumentParserService } from "@/app/intake/documentParserService";
import { IntakeOrchestrator } from "@/app/intake/intakeOrchestrator";

function buildOrchestrator() {
  const documentParserService = new DocumentParserService(
    createFakeDocumentParser(),
  );
  const orchestrator = new IntakeOrchestrator({
    speechAgent: createFakeSpeechAgent(),
    jobSpecRepo: createInMemoryJobSpecRepository(),
    documentParserService,
  });
  return { orchestrator };
}

describe("IntakeOrchestrator", () => {
  it("starts a draft and voice session", async () => {
    const { jobSpecId, sessionId } = await buildOrchestrator().orchestrator.startIntake("Austin, TX");
    expect(jobSpecId).toBeTruthy();
    expect(sessionId).toMatch(/^fake-session-/);
  });

  it("syncs transcript fields into an unconfirmed spec", async () => {
    const { orchestrator } = buildOrchestrator();
    const { jobSpecId, sessionId } = await orchestrator.startIntake("Austin, TX");
    const updated = await orchestrator.syncVoiceTranscript(jobSpecId, sessionId);
    expect(updated).toMatchObject({ sqft: 1800, bedrooms: 3, confirmed: false });
  });

  it("applies a document leverage amount", async () => {
    const { orchestrator } = buildOrchestrator();
    const { jobSpecId } = await orchestrator.startIntake("Austin, TX");
    const updated = await orchestrator.applyQuoteDocument(jobSpecId, new Uint8Array([1]), "application/pdf");
    expect(updated.leverageQuoteAmount).toBe(185);
  });
});
