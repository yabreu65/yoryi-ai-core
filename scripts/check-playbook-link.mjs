#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const PLAYBOOK_VERSION_PATH = resolve(ROOT, "PLAYBOOK_VERSION");
const PLAYBOOK_LINK_PATH = resolve(ROOT, "docs/architecture/playbook-link.md");
const CORE_PATH = "/Users/yoryiabreu/proyectos/yoryi-core-architecture";

const REQUIRED_DOC_PATHS = [
  "domains/ai/agents/tool-contracts.md",
  "domains/backend/security/identity-tenant-context.md",
  "domains/backend/postgres/multi-tenancy-data-isolation.md",
  "checks/architecture/planning-quality-scorecard.md",
];

const errors = [];

if (!existsSync(PLAYBOOK_VERSION_PATH)) {
  errors.push("Missing required file: PLAYBOOK_VERSION");
}

if (!existsSync(PLAYBOOK_LINK_PATH)) {
  errors.push("Missing required file: docs/architecture/playbook-link.md");
}

let playbookLinkContent = "";
if (existsSync(PLAYBOOK_LINK_PATH)) {
  playbookLinkContent = readFileSync(PLAYBOOK_LINK_PATH, "utf8");
}

if (playbookLinkContent.length > 0 && !playbookLinkContent.includes(CORE_PATH)) {
  errors.push(
    `playbook-link.md must include canonical core path: ${CORE_PATH}`
  );
}

for (const docPath of REQUIRED_DOC_PATHS) {
  if (playbookLinkContent.length > 0 && !playbookLinkContent.includes(docPath)) {
    errors.push(`playbook-link.md must include required core doc path: ${docPath}`);
  }
}

if (errors.length > 0) {
  console.error("Playbook enforcement check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Playbook enforcement check passed.");