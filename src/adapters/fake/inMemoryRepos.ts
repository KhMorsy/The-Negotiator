import { createInMemoryAuditRepository } from "./inMemoryAuditRepository";
import { createInMemoryCallRepository } from "./inMemoryCallRepository";
import { createInMemoryJobSpecRepository } from "./inMemoryJobSpecRepository";
import { createInMemoryQuoteRepository } from "./inMemoryQuoteRepository";

export function createInMemoryRepos() {
  return {
    jobSpecs: createInMemoryJobSpecRepository(),
    calls: createInMemoryCallRepository(),
    quotes: createInMemoryQuoteRepository(),
    audit: createInMemoryAuditRepository(),
  };
}

export {
  createInMemoryAuditRepository,
  createInMemoryCallRepository,
  createInMemoryJobSpecRepository,
  createInMemoryQuoteRepository,
};

