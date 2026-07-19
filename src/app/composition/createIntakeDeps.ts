import { createFakeDocumentParser } from "@/adapters/fake/fakeDocumentParser";
import { createFakeSpeechAgent } from "@/adapters/fake/fakeSpeechAgent";
import { createInMemoryJobSpecRepository } from "@/adapters/fake/inMemoryRepos";
import { DocumentParserService } from "../intake/documentParserService";
import { IntakeOrchestrator } from "../intake/intakeOrchestrator";

let orchestrator: IntakeOrchestrator | undefined;

export function getIntakeOrchestrator(): IntakeOrchestrator {
  if (!orchestrator) {
    orchestrator = new IntakeOrchestrator({
      speechAgent: createFakeSpeechAgent(),
      jobSpecRepo: createInMemoryJobSpecRepository(),
      documentParserService: new DocumentParserService(createFakeDocumentParser()),
    });
  }
  return orchestrator;
}
