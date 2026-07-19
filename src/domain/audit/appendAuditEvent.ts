import type { AuditEvent, AuditRepository } from "@/contracts";

export async function appendAuditEvent(
  repo: AuditRepository,
  input: Omit<AuditEvent, "id" | "createdAt">,
): Promise<AuditEvent> {
  return repo.append(input);
}
