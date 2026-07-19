import type { EmailNotifier } from "@/contracts";

export function createFakeEmailNotifier(): EmailNotifier & {
  sent: Array<{ toEmail: string; jobSpecId: string }>;
} {
  const sent: Array<{ toEmail: string; jobSpecId: string }> = [];
  let seq = 0;
  return {
    sent,
    async sendJobSpecRequest(input) {
      sent.push({ toEmail: input.toEmail, jobSpecId: input.jobSpec.id });
      return { messageId: `fake-msg-${++seq}` };
    },
  };
}
