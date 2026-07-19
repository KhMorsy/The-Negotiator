import type { JobSpec } from "../types";

export interface EmailNotifier {
  sendJobSpecRequest(input: {
    toEmail: string;
    jobSpec: JobSpec;
    vendorName: string;
  }): Promise<{ messageId: string }>;
}
