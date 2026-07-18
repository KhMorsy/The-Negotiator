export interface TelephonyProvider {
  startCall(input: {
    jobSpecId: string;
    vendorId: string;
    round: 1 | 2;
  }): Promise<{ callId: string }>;
  endCall(callId: string): Promise<void>;
}

