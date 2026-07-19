import type { AuditEvent, AuditRepository } from "@/contracts";

export function createInMemoryAuditRepository(): AuditRepository {
  const eventsByCall = new Map<string, AuditEvent[]>();
  let eventSequence = 0;

  return {
    async append(input) {
      eventSequence += 1;
      const event: AuditEvent = {
        ...input,
        id: `audit-${eventSequence}`,
        createdAt: new Date().toISOString(),
      };
      const events = eventsByCall.get(event.callId) ?? [];
      eventsByCall.set(event.callId, [...events, event]);
      return event;
    },
    async listByCall(callId) {
      return eventsByCall.get(callId) ?? [];
    },
  };
}
