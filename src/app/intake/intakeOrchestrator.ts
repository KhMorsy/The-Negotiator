import type { JobSpec, JobSpecRepository, SpeechAgent } from "@/contracts";
import { DocumentParserService } from "./documentParserService";

function extractFieldsFromTranscript(
  turns: Array<{ role: string; text: string }>,
): Partial<JobSpec> {
  const userText = turns.filter((turn) => turn.role === "user").map((turn) => turn.text).join(" ");
  return userText.includes("1800")
    ? { sqft: 1800, bedrooms: 3, bathrooms: 2, frequency: "weekly", pets: true }
    : {};
}

export class IntakeOrchestrator {
  constructor(private readonly deps: {
    speechAgent: SpeechAgent;
    jobSpecRepo: JobSpecRepository;
    documentParserService: DocumentParserService;
  }) {}

  async startIntake(geo: string) {
    const draft = await this.deps.jobSpecRepo.create({
      jobType: "recurring_weekly", sqft: 0, bedrooms: 0, bathrooms: 0,
      frequency: "weekly", addOns: [], suppliesProvided: false, pets: false,
      accessNotes: "", conditionNotes: "", geo,
    });
    const { sessionId } = await this.deps.speechAgent.startIntakeSession(draft.id);
    return { jobSpecId: draft.id, sessionId };
  }

  async syncVoiceTranscript(jobSpecId: string, sessionId: string) {
    const { turns } = await this.deps.speechAgent.getIntakeTranscript(sessionId);
    return this.deps.jobSpecRepo.updateDraft(jobSpecId, {
      ...extractFieldsFromTranscript(turns), jobType: "recurring_weekly",
    });
  }

  async applyQuoteDocument(jobSpecId: string, bytes: Uint8Array, mimeType: string) {
    const { jobSpecPatch, leverageQuoteAmount } = await this.deps.documentParserService.parseQuoteUpload({ bytes, mimeType });
    return this.deps.jobSpecRepo.updateDraft(jobSpecId, {
      ...jobSpecPatch,
      ...(leverageQuoteAmount === undefined ? {} : { leverageQuoteAmount }),
    });
  }
}
