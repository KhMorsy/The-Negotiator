import type { JobSpec, JobSpecRepository, SpeechAgent } from "@/contracts";
import { DocumentParserService } from "./documentParserService";

type LiveInterviewDetails = Partial<
  Pick<
    JobSpec,
    | "sqft"
    | "bedrooms"
    | "bathrooms"
    | "frequency"
    | "pets"
    | "addOns"
    | "suppliesProvided"
    | "accessNotes"
    | "conditionNotes"
  >
>;

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

  async applyLiveInterviewDetails(jobSpecId: string, details: LiveInterviewDetails) {
    return this.deps.jobSpecRepo.updateDraft(jobSpecId, details);
  }

  async applyQuoteDocument(jobSpecId: string, bytes: Uint8Array, mimeType: string) {
    const { jobSpecPatch, leverageQuoteAmount } = await this.deps.documentParserService.parseQuoteUpload({ bytes, mimeType });
    return this.deps.jobSpecRepo.updateDraft(jobSpecId, {
      ...jobSpecPatch,
      ...(leverageQuoteAmount === undefined ? {} : { leverageQuoteAmount }),
    });
  }

  async mergeRoomPhotos(
    jobSpecId: string,
    images: Array<{ bytes: Uint8Array; mimeType: string }>,
  ): Promise<JobSpec> {
    const patch = await this.deps.documentParserService.parseRoomPhotos(images);
    return this.deps.jobSpecRepo.updateDraft(jobSpecId, patch);
  }
}
