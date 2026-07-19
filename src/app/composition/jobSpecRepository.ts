import { createInMemoryJobSpecRepository } from "@/adapters/fake/inMemoryRepos";

let repository = createInMemoryJobSpecRepository();

export function getJobSpecRepository() {
  return repository;
}

export function resetJobSpecRepositoryForTests() {
  repository = createInMemoryJobSpecRepository();
  return repository;
}
