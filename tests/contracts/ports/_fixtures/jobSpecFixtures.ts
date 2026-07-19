import type { JobSpec } from "@/contracts";

export const sampleJobSpecDraft: Omit<JobSpec, "id" | "confirmed"> = {
  jobType: "deep_clean",
  sqft: 1200,
  bedrooms: 2,
  bathrooms: 2,
  frequency: "once",
  addOns: ["inside_fridge"],
  suppliesProvided: false,
  pets: true,
  accessNotes: "Gate code 1234",
  conditionNotes: "Kitchen grease buildup",
  geo: "San Francisco, CA",
};

