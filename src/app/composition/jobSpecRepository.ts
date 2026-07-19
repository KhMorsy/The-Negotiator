import { createContainer, resetContainerForTests } from "./createContainer";

export function getJobSpecRepository() {
  return createContainer().repos.jobSpecs;
}

export function resetJobSpecRepositoryForTests() {
  resetContainerForTests();
  return createContainer().repos.jobSpecs;
}
