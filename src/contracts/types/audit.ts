export interface AuditEvent {
  id: string;
  callId: string;
  skillId: string;
  authorizingEvidence: Record<string, unknown>;
  priceBefore: number | null;
  priceAfter: number | null;
  createdAt: string;
}

