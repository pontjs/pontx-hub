import skill from "../../plugins/pontx-api/skills/pontx-hub/SKILL.md?raw";
import agent from "../../plugins/pontx-api/skills/pontx-hub/agents/openai.yaml?raw";
import safety from "../../plugins/pontx-api/skills/pontx-hub/references/auth-and-safety.md?raw";

export const PONTX_HUB_SKILL_DESCRIPTION =
  "Search, inspect, preview, call, and integrate curated public APIs through Pontx Hub. Use when an agent needs API discovery, OpenAPI Endpoint or Schema search, safe request preview, explicit mutation confirmation, or SDK generation.";

export const skillBundle = {
  name: "pontx-hub",
  version: "0.3.0",
  files: {
    "SKILL.md": skill,
    "agents/openai.yaml": agent,
    "references/auth-and-safety.md": safety
  }
};
