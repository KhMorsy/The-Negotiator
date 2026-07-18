/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-no-adapters",
      severity: "error",
      comment: "Domain must not import adapters or vendor SDKs.",
      from: { path: "^src/domain" },
      to: {
        path: "^(src/adapters|node_modules/(openai|@supabase|twilio|@elevenlabs))",
      },
    },
    {
      name: "domain-no-app-frontend",
      severity: "error",
      comment: "Domain must not import app or frontend.",
      from: { path: "^src/domain" },
      to: { path: "^(src/app|src/frontend)" },
    },
    {
      name: "domain-only-contracts",
      severity: "error",
      comment: "Domain may only import contracts (and itself).",
      from: { path: "^src/domain" },
      to: {
        path: "^src",
        pathNot: "^(src/domain|src/contracts)",
      },
    },
    {
      name: "app-no-adapters-except-composition",
      severity: "error",
      comment: "Application may import adapters only from composition root.",
      from: {
        path: "^src/app",
        pathNot: "^src/app/composition",
      },
      to: { path: "^src/adapters" },
    },
    {
      name: "frontend-no-domain-adapters",
      severity: "error",
      comment: "Frontend must not import domain or adapters.",
      from: { path: "^src/frontend" },
      to: { path: "^(src/domain|src/adapters)" },
    },
    {
      name: "contracts-isolated",
      severity: "error",
      comment: "Contracts must not import other layers.",
      from: { path: "^src/contracts" },
      to: { path: "^(src/domain|src/app|src/adapters|src/frontend)" },
    },
    {
      name: "adapters-no-domain",
      severity: "error",
      comment: "Adapters must not import domain.",
      from: { path: "^src/adapters" },
      to: { path: "^src/domain" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
