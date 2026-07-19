import { createFakeDocumentParser } from "@/adapters/fake/fakeDocumentParser";
import { createFakeSpeechAgent } from "@/adapters/fake/fakeSpeechAgent";
import { DocumentParserService } from "../intake/documentParserService";
import { IntakeOrchestrator } from "../intake/intakeOrchestrator";
import { getJobSpecRepository } from "./jobSpecRepository";

let orchestrator: IntakeOrchestrator | undefined;

export function getIntakeOrchestrator(): IntakeOrchestrator {
  if (!orchestrator) {
    orchestrator = new IntakeOrchestrator({
      speechAgent: createFakeSpeechAgent(),
      jobSpecRepo: getJobSpecRepository(),
      documentParserService: new DocumentParserService(createFakeDocumentParser()),
    });
  }
  return orchestrator;
}
