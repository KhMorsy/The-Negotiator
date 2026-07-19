"use client";

import { LiveVoiceInterview } from "@/adapters/speech/LiveVoiceInterview";
import { IntakeScreen } from "@/frontend/screens/IntakeScreen";

export function LiveIntakeScreen({
  jobId,
  sessionId,
}: {
  jobId: string;
  sessionId?: string;
}) {
  return (
    <IntakeScreen
      jobId={jobId}
      sessionId={sessionId}
      LiveVoiceInterviewComponent={LiveVoiceInterview}
    />
  );
}
