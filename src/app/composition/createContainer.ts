import { createFakeDocumentParser } from "@/adapters/fake/fakeDocumentParser";
import { createFakeSpeechAgent } from "@/adapters/fake/fakeSpeechAgent";
import { createFakeVendorDirectory } from "@/adapters/fake/fakeVendorDirectory";
import { createSimulatedCallAdapter } from "@/adapters/fake/simulatedTelephony";
import { createElevenLabsAgentAdapter } from "@/adapters/speech/elevenLabsAgent";
import { CallOrchestrator } from "@/app/calls/callOrchestrator";
import { DocumentParserService } from "@/app/intake/documentParserService";
import { IntakeOrchestrator } from "@/app/intake/intakeOrchestrator";
import { ReportComposer } from "@/app/report/reportComposer";
import type { SpeechAgent } from "@/contracts";
import { createTestContainer, type AppContainer } from "./createTestContainer";

export interface Container extends AppContainer {
  telephony: ReturnType<typeof createSimulatedCallAdapter>;
  intakeOrchestrator: IntakeOrchestrator;
  callOrchestrator: CallOrchestrator;
  reportComposer: ReportComposer;
  speechAgentKind: "fake" | "elevenlabs";
  listAuditByJobSpec(jobSpecId: string): ReturnType<Container["repos"]["audit"]["listByCall"]>;
}

let singleton: Container | undefined;

function buildContainer(): Container {
  const app = createTestContainer();
  const telephony = createSimulatedCallAdapter();
  const vendorDirectory = createFakeVendorDirectory();
  const speech = selectSpeechAgent();
  const intakeOrchestrator = new IntakeOrchestrator({
    speechAgent: speech.agent,
    jobSpecRepo: app.repos.jobSpecs,
    documentParserService: new DocumentParserService(createFakeDocumentParser()),
  });
  const callOrchestrator = new CallOrchestrator({
    jobSpecRepo: app.repos.jobSpecs,
    quoteRepo: app.repos.quotes,
    auditRepo: app.repos.audit,
    callRepo: app.repos.calls,
    telephony,
    vendorDirectory,
  });
  const reportComposer = new ReportComposer({
    quoteRepo: app.repos.quotes,
    getJobSpec: (id) => app.repos.jobSpecs.getById(id),
    getVendors: async (jobSpecId) => {
      const jobSpec = await app.repos.jobSpecs.getById(jobSpecId);
      if (!jobSpec) {
        return [];
      }
      return vendorDirectory.findVendors({
        geo: jobSpec.geo,
        jobType: jobSpec.jobType,
        limit: 3,
      });
    },
  });

  return {
    ...app,
    telephony,
    intakeOrchestrator,
    callOrchestrator,
    reportComposer,
    speechAgentKind: speech.kind,
    async listAuditByJobSpec(jobSpecId) {
      const calls = await app.repos.calls.listByJobSpec(jobSpecId);
      const eventGroups = await Promise.all(
        calls.map((call) => app.repos.audit.listByCall(call.id)),
      );
      return eventGroups.flat();
    },
  };
}

function selectSpeechAgent(): {
  agent: SpeechAgent;
  kind: "fake" | "elevenlabs";
} {
  const useSimulated =
    process.env.USE_SIMULATED_SPEECH !== "false" ||
    !process.env.ELEVENLABS_API_KEY ||
    !process.env.ELEVENLABS_AGENT_ID;

  if (useSimulated) {
    return { agent: createFakeSpeechAgent(), kind: "fake" };
  }

  return { agent: createElevenLabsAgentAdapter(), kind: "elevenlabs" };
}

export function createContainer(): Container {
  singleton ??= buildContainer();
  return singleton;
}

export function resetContainerForTests() {
  singleton = undefined;
}
