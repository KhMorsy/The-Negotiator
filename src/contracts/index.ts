/**
 * Contracts public barrel. Populated in PR-01.
 * Keeping a tiny export so dependency-cruiser / typecheck have an entrypoint.
 */
export const CONTRACTS_VERSION = "0.1.0" as const;

export * from "./types";
export * from "./schemas";
export * from "./ports";
export * from "./config/vertical";
