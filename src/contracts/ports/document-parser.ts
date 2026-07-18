import type { JobSpec } from "../types";

export interface DocumentParser {
  parseExistingQuote(input: { bytes: Uint8Array; mimeType: string }): Promise<
    Partial<JobSpec> & {
      leverageQuote?: { amount: number; vendorName?: string };
    }
  >;

  parseRoomPhotos(input: {
    images: Array<{ bytes: Uint8Array; mimeType: string }>;
  }): Promise<Partial<JobSpec>>;
}

