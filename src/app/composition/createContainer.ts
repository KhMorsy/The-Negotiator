import { createFakeDocumentParser } from "@/adapters/fake/fakeDocumentParser";
import { createFileSkillRepository } from "@/adapters/persistence/fileSkillRepository";
import { createOpenAiVisionAdapter } from "@/adapters/llm/openAiVisionAdapter";
import { createFakeSpeechAgent } from "@/adapters/fake/fakeSpeechAgent";
import { createFakeVendorDirectory } from "@/adapters/fake/fakeVendorDirectory";
import { createInMemoryKb } from "@/adapters/fake/inMemoryKb";
import { createSimulatedCallAdapter } from "@/adapters/fake/simulatedTelephony";
import {
  createDefaultTavilySearchFn,
  createTavilyKb,
} from "@/adapters/kb/tavilyKb";
import { createElevenLabsAgentAdapter } from "@/adapters/speech/elevenLabsAgent";
import {
  createTwilioElevenLabsAdapter,
  createTwilioHttpClient,
} from "@/adapters/telephony/twilioElevenLabs";
import { CallOrchestrator } from "@/app/calls/callOrchestrator";
import { DocumentParserService } from "@/app/intake/documentParserService";
import { IntakeOrchestrator } from "@/app/intake/intakeOrchestrator";
import { ReportComposer } from "@/app/report/reportComposer";
import type {
  DocumentParser,
  KnowledgeBase,
  SkillRepository,
  SpeechAgent,
  TelephonyProvider,
  VendorDirectory,
} from "@/contracts";
import { createTestContainer, type AppContainer } from "./createTestContainer";

export interface Container extends AppContainer {
  telephony: TelephonyProvider;
  intakeOrchestrator: IntakeOrchestrator;
  callOrchestrator: CallOrchestrator;
  reportComposer: ReportComposer;
  speechAgentKind: "fake" | "elevenlabs";
  telephonyKind: "simulated" | "twilio";
  kbProviderKind: "snippets" | "tavily";
  skillRepo: SkillRepository;
  listAuditByJobSpec(jobSpecId: string): ReturnType<Container["repos"]["audit"]["listByCall"]>;
}

// Stored on globalThis so in-memory state survives Next.js dev HMR module reloads.
const globalStore = globalThis as { __negotiatorContainer?: Container };

function buildContainer(): Container {
  const app = createTestContainer();
  const vendorDirectory = createFakeVendorDirectory();
  const telephony = selectTelephonyProvider(vendorDirectory);
  const speech = selectSpeechAgent();
  const kb = selectKnowledgeBase();
  const skillRepo = createFileSkillRepository(resolveGeneratedSkillDirectory());
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
    documentParserService: new DocumentParserService(selectDocumentParser()),
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
    kb: kb.kb,
    telephony: telephony.provider,
    intakeOrchestrator,
    callOrchestrator,
    reportComposer,
    speechAgentKind: speech.kind,
    telephonyKind: telephony.kind,
    kbProviderKind: kb.kind,
    skillRepo,
    listAuditByJobSpec: getAuditEvents,
  };
}


function selectDocumentParser(): DocumentParser {
  const apiKey = process.env.OPENAI_API_KEY;
  if (process.env.USE_FAKE_DOCUMENT_PARSER === "false" && apiKey) {
    return createOpenAiVisionAdapter({ apiKey });
  }
  return createFakeDocumentParser();
}

export function resolveGeneratedSkillDirectory(
  env: { SKILL_GENERATED_DIR?: string; VERCEL?: string } = {
    SKILL_GENERATED_DIR: process.env.SKILL_GENERATED_DIR,
    VERCEL: process.env.VERCEL,
  },
): string {
  return env.SKILL_GENERATED_DIR ??
    (env.VERCEL ? "/tmp/the-negotiator-skills" : "config/skills/generated");
}

function selectKnowledgeBase(): {
  kb: KnowledgeBase;
  kind: "snippets" | "tavily";
} {
  const snippets = createInMemoryKb();
  const wantTavily =
    process.env.KB_PROVIDER === "tavily" && Boolean(process.env.TAVILY_API_KEY);

  if (!wantTavily) {
    return { kb: snippets, kind: "snippets" };
  }

  try {
    return {
      kb: createTavilyKb({
        searchFn: createDefaultTavilySearchFn(),
        fallback: snippets,
      }),
      kind: "tavily",
    };
  } catch {
    return { kb: snippets, kind: "snippets" };
  }
}

function selectTelephonyProvider(vendorDirectory: VendorDirectory): {
  provider: TelephonyProvider;
  kind: "simulated" | "twilio";
} {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const connectUrl = process.env.ELEVENLABS_TWILIO_CONNECT_URL;
  const wantLive =
    process.env.USE_SIMULATED_TELEPHONY === "false" &&
    Boolean(accountSid && authToken && fromNumber && connectUrl);

  if (!wantLive) {
    return { provider: createSimulatedCallAdapter(), kind: "simulated" };
  }

  return {
    provider: createTwilioElevenLabsAdapter({
      twilio: createTwilioHttpClient(accountSid!, authToken!),
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
      connectUrl: connectUrl!,
      fromNumber: fromNumber!,
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
