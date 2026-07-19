import { createFakeDocumentParser } from "@/adapters/fake/fakeDocumentParser";
import { createFakeSpeechAgent } from "@/adapters/fake/fakeSpeechAgent";
import { createFakeVendorDirectory } from "@/adapters/fake/fakeVendorDirectory";
import { createSimulatedCallAdapter } from "@/adapters/fake/simulatedTelephony";
import { createElevenLabsAgentAdapter } from "@/adapters/speech/elevenLabsAgent";
import {
  createTwilioElevenLabsAdapter,
  createTwilioHttpClient,
} from "@/adapters/telephony/twilioElevenLabs";
import { CallOrchestrator } from "@/app/calls/callOrchestrator";
import { DocumentParserService } from "@/app/intake/documentParserService";
import { IntakeOrchestrator } from "@/app/intake/intakeOrchestrator";
import { ReportComposer } from "@/app/report/reportComposer";
import type { SpeechAgent, TelephonyProvider, VendorDirectory } from "@/contracts";
import { createTestContainer, type AppContainer } from "./createTestContainer";

export interface Container extends AppContainer {
  telephony: TelephonyProvider;
  intakeOrchestrator: IntakeOrchestrator;
  callOrchestrator: CallOrchestrator;
  reportComposer: ReportComposer;
  speechAgentKind: "fake" | "elevenlabs";
  telephonyKind: "simulated" | "twilio";
  listAuditByJobSpec(jobSpecId: string): ReturnType<Container["repos"]["audit"]["listByCall"]>;
}

// Stored on globalThis so in-memory state survives Next.js dev HMR module reloads.
const globalStore = globalThis as { __negotiatorContainer?: Container };

function buildContainer(): Container {
  const app = createTestContainer();
  const vendorDirectory = createFakeVendorDirectory();
  const telephony = selectTelephonyProvider(vendorDirectory);
  const speech = selectSpeechAgent();
  const getAuditEvents = async (jobSpecId: string) => {
    const calls = await app.repos.calls.listByJobSpec(jobSpecId);
    const eventGroups = await Promise.all(
      calls.map((call) => app.repos.audit.listByCall(call.id)),
    );
    return eventGroups.flat();
  };
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
    telephony: telephony.provider,
    vendorDirectory,
  });
  const reportComposer = new ReportComposer({
    quoteRepo: app.repos.quotes,
    getAuditEvents,
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
    telephony: telephony.provider,
    intakeOrchestrator,
    callOrchestrator,
    reportComposer,
    speechAgentKind: speech.kind,
    telephonyKind: telephony.kind,
    listAuditByJobSpec: getAuditEvents,
  };
}

function selectTelephonyProvider(vendorDirectory: VendorDirectory): {
  provider: TelephonyProvider;
  kind: "simulated" | "twilio";
} {
  if (process.env.USE_SIMULATED_TELEPHONY !== "false") {
    return { provider: createSimulatedCallAdapter(), kind: "simulated" };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const connectUrl = process.env.ELEVENLABS_TWILIO_CONNECT_URL;
  if (!accountSid || !authToken || !fromNumber || !connectUrl) {
    throw new Error("Twilio credentials and ELEVENLABS_TWILIO_CONNECT_URL required");
  }

  return {
    provider: createTwilioElevenLabsAdapter({
      twilio: createTwilioHttpClient(accountSid, authToken),
      resolveVendorPhone: async (vendorId) => {
        const vendors = await vendorDirectory.findVendors({
          geo: "",
          jobType: "recurring_weekly",
          limit: 20,
        });
        const vendor = vendors.find((candidate) => candidate.id === vendorId);
        if (!vendor) {
          throw new Error(`Vendor not found: ${vendorId}`);
        }
        return vendor.phone;
      },
      connectUrl,
      fromNumber,
    }),
    kind: "twilio",
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
  globalStore.__negotiatorContainer ??= buildContainer();
  return globalStore.__negotiatorContainer;
}

export function resetContainerForTests() {
  globalStore.__negotiatorContainer = undefined;
}
