import type { DocumentParser } from "@/contracts";

export function createFakeDocumentParser(): DocumentParser {
  return {
    async parseExistingQuote() {
      return {
        sqft: 1800,
        bedrooms: 3,
        bathrooms: 2,
        jobType: "recurring_weekly" as const,
        frequency: "weekly" as const,
        leverageQuote: { amount: 185, vendorName: "Previous Cleaner LLC" },
      };
    },
    async parseRoomPhotos() {
      return { sqft: 1600, bedrooms: 2, bathrooms: 2 };
    },
  };
}
