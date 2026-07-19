import type {
  CallOutcome,
  CallRepository,
  EmailNotifier,
  JobSpec,
} from "@/contracts";
import { detectQuoteRefusal } from "@/domain/calls/detectQuoteRefusal";

export async function handleEmailFallback(
  deps: { emailNotifier: EmailNotifier; callRepo: CallRepository },
  input: {
    callId: string;
    jobSpec: JobSpec;
    vendorEmail: string;
    vendorName: string;
    lastVendorUtterance: string;
  },
): Promise<{ outcome: CallOutcome; messageId?: string }> {
  const { refused } = detectQuoteRefusal(input.lastVendorUtterance);
  if (!refused) {
    await deps.callRepo.updateOutcome(input.callId, "documented_decline");
    return { outcome: "documented_decline" };
  }

  try {
    const { messageId } = await deps.emailNotifier.sendJobSpecRequest({
      toEmail: input.vendorEmail,
      jobSpec: input.jobSpec,
      vendorName: input.vendorName,
    });
    await deps.callRepo.updateOutcome(input.callId, "callback_commitment");
    return { outcome: "callback_commitment", messageId };
  } catch {
    await deps.callRepo.updateOutcome(input.callId, "documented_decline");
    return { outcome: "documented_decline" };
  }
}
