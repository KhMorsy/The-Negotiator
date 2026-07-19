import { randomUUID } from "node:crypto";

export function isAssistedCallCopilotEnabled(): boolean {
  return process.env.FEATURE_ASSISTED_CALL_COPILOT === "true";
}

export async function createCopilotSession(input: {
  jobSpecId: string;
  customerPhone: string;
}) {
  if (!isAssistedCallCopilotEnabled()) {
    return {
      enabled: false,
      sessionId: null as string | null,
      message:
        "Assisted-call co-pilot is disabled. Set FEATURE_ASSISTED_CALL_COPILOT=true to enable.",
    };
  }

  return {
    enabled: true,
    sessionId: `copilot-${randomUUID()}`,
    message: `Co-pilot session ready for job ${input.jobSpecId}. Customer will join bridged call (stub). Phone: ${input.customerPhone}`,
  };
}
