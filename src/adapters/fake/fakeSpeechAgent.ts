import type { SpeechAgent } from "@/contracts";

const TRANSCRIPT = [
  { role: "agent", text: "How many square feet is your home?" },
  { role: "user", text: "About 1800 square feet, three beds two baths." },
  { role: "agent", text: "Weekly recurring clean?" },
  { role: "user", text: "Yes weekly, we have a dog." },
];

export function createFakeSpeechAgent(): SpeechAgent {
  const sessions = new Map<string, typeof TRANSCRIPT>();
  return {
    async startIntakeSession(jobSpecDraftId) {
      const sessionId = `fake-session-${jobSpecDraftId}`;
      sessions.set(sessionId, TRANSCRIPT);
      return { sessionId };
    },
    async getIntakeTranscript(sessionId) {
      return { turns: sessions.get(sessionId) ?? TRANSCRIPT };
    },
  };
}
