import type { DocumentParser, JobSpec } from "@/contracts";

export class DocumentParserService {
  constructor(private readonly documentParser: DocumentParser) {}

  async parseQuoteUpload(input: { bytes: Uint8Array; mimeType: string }) {
    const { leverageQuote, ...jobSpecPatch } =
      await this.documentParser.parseExistingQuote(input);
    return {
      jobSpecPatch: jobSpecPatch as Partial<JobSpec>,
      leverageQuoteAmount: leverageQuote?.amount,
    };
  }

  async parseRoomPhotos(
    images: Array<{ bytes: Uint8Array; mimeType: string }>,
  ): Promise<Partial<JobSpec>> {
    return this.documentParser.parseRoomPhotos({ images });
  }
}
