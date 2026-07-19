export interface SpeechAgent {
  startIntakeSession(jobSpecDraftId: string): Promise<{ sessionId: string }>;
  getIntakeTranscript(sessionId: string): Promise<{
    turns: Array<{ role: string; text: string }>;
  }>;
}

