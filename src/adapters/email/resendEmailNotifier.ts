import type { EmailNotifier } from "@/contracts";

export function createResendEmailNotifier(options: {
  apiKey: string;
  fromEmail: string;
}): EmailNotifier {
  const { apiKey, fromEmail } = options;
  return {
    async sendJobSpecRequest(input) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [input.toEmail],
          subject: `Cleaning quote request for ${input.jobSpec.geo}`,
          text: [
            `Hello ${input.vendorName},`,
            "",
            "Please quote the following confirmed job:",
            JSON.stringify(input.jobSpec, null, 2),
          ].join("\n"),
        }),
      });
      if (!response.ok) {
        throw new Error(`Resend failed: ${response.status}`);
      }
      const body = (await response.json()) as { id?: string };
      return { messageId: body.id ?? `resend-${Date.now()}` };
    },
  };
}
