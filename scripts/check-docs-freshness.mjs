#!/usr/bin/env node
/**
 * Docs freshness gate.
 * If src/<layer>/** changed, require docs/architecture/layers/<layer>.md to change
 * unless PR labels include "no-docs-needed".
 *
 * On push to main (no PR), skip unless BASE_SHA is a valid prior commit.
 */
import { execSync } from "node:child_process";

const labels = (process.env.PR_LABELS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (labels.includes("no-docs-needed")) {
  console.log("Docs freshness skipped via no-docs-needed label.");
  process.exit(0);
}

const layerMap = {
  "src/contracts": "docs/architecture/layers/contracts.md",
  "src/domain": "docs/architecture/layers/domain.md",
  "src/app": "docs/architecture/layers/application.md",
  "src/adapters": "docs/architecture/layers/adapters.md",
  "src/frontend": "docs/architecture/layers/frontend.md",
};

const base = process.env.BASE_SHA;
const head = process.env.HEAD_SHA || "HEAD";

if (!base || base === "0000000000000000000000000000000000000000") {
  console.log("No PR base SHA; skipping docs freshness on this event.");
  process.exit(0);
}

let changed = "";
try {
  changed = execSync(`git diff --name-only ${base}...${head}`, {
    encoding: "utf8",
  });
} catch (err) {
  console.warn("Could not diff commits; skipping docs freshness.", err.message);
  process.exit(0);
}

const files = changed.split("\n").filter(Boolean);
const missing = [];

for (const [srcPrefix, docPath] of Object.entries(layerMap)) {
  const srcTouched = files.some((f) => f.startsWith(srcPrefix + "/"));
  if (!srcTouched) continue;
  const docTouched = files.some((f) => f === docPath);
  if (!docTouched) missing.push(`${srcPrefix}/** changed but ${docPath} not updated`);
}

if (missing.length) {
  console.error("Docs freshness gate failed:\n- " + missing.join("\n- "));
  console.error(
    "\nUpdate the layer doc(s) or add the 'no-docs-needed' label with justification.",
  );
  process.exit(1);
}

console.log("Docs freshness OK.");
