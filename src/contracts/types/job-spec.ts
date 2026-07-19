export type JobType =
  | "recurring_weekly"
  | "recurring_biweekly"
  | "recurring_monthly"
  | "deep_clean"
  | "move_out"
  | "post_renovation"
  | "turnover";

export interface JobSpec {
  id: string;
  jobType: JobType;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  frequency: "once" | "weekly" | "biweekly" | "monthly";
  addOns: string[];
  suppliesProvided: boolean;
  pets: boolean;
  accessNotes: string;
  conditionNotes: string;
  geo: string;
  confirmed: boolean;
  leverageQuoteAmount?: number;
}

