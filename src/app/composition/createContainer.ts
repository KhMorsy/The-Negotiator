import { createFakeDocumentParser } from "@/adapters/fake/fakeDocumentParser";
import { createFakeSpeechAgent } from "@/adapters/fake/fakeSpeechAgent";
import { createFakeVendorDirectory } from "@/adapters/fake/fakeVendorDirectory";
import { createSimulatedCallAdapter } from "@/adapters/fake/simulatedTelephony";
import { CallOrchestrator } from "@/app/calls/callOrchestrator";
import { DocumentParserService } from "@/app/intake/documentParserService";
import { IntakeOrchestrator } from "@/app/intake/intakeOrchestrator";
import { ReportComposer } from "@/app/report/reportComposer";
import { createTestContainer, type AppContainer } from "./createTestContainer";

export interface Container extends AppContainer {
  telephony: ReturnType<typeof createSimulatedCallAdapter>;
  intakeOrchestrator: IntakeOrchestrator;
  callOrchestrator: CallOrchestrator;
  reportComposer: ReportComposer;
  listAuditByJobSpec(jobSpecId: string): ReturnType<Container["repos"]["audit"]["listByCall"]>;
}

// Stored on globalThis so in-memory state survives Next.js dev HMR module reloads.
const globalStore = globalThis as { __negotiatorContainer?: Container };

function buildContainer(): Container {
  const app = createTestContainer();
  const telephony = createSimulatedCallAdapter();
  const vendorDirectory = createFakeVendorDirectory();
  const intakeOrchestrator = new IntakeOrchestrator({
    speechAgent: createFakeSpeechAgent(),
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
    async listAuditByJobSpec(jobSpecId) {
      const calls = await app.repos.calls.listByJobSpec(jobSpecId);
      const eventGroups = await Promise.all(
        calls.map((call) => app.repos.audit.listByCall(call.id)),
      );
      return eventGroups.flat();
    },
  };
}

export function createContainer(): Container {
  globalStore.__negotiatorContainer ??= buildContainer();
  return globalStore.__negotiatorContainer;
}

export function resetContainerForTests() {
  globalStore.__negotiatorContainer = undefined;
}
