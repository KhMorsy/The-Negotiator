import { randomUUID } from "node:crypto";
import type { AuditEvent, AuditRepository } from "@/contracts";

export function createInMemoryAuditRepository(): AuditRepository {
  const events: AuditEvent[] = [];

  return {
    async append(input) {
      const event: AuditEvent = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        ...input,
      };
      events.push(event);
      return event;
    },

    async listByCall(callId) {
      return events.filter((e) => e.callId === callId);
    },
  };
}

