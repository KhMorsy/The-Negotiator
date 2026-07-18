export type CallOutcome =
  | "itemized_quote"
  | "callback_commitment"
  | "documented_decline"
  | "voicemail"
  | "no_answer";

export type CallRound = 1 | 2;

export interface Call {
  id: string;
  jobSpecId: string;
  vendorId: string;
  round: CallRound;
  outcome: CallOutcome | null;
  recordingUrl: string | null;
}

