import skill from "../../skills/pontx-hub/SKILL.md?raw";
import agent from "../../skills/pontx-hub/agents/openai.yaml?raw";
import safety from "../../skills/pontx-hub/references/auth-and-safety.md?raw";

export const skillBundle = {
  name: "pontx-hub",
  version: "0.2.0",
  files: {
    "SKILL.md": skill,
    "agents/openai.yaml": agent,
    "references/auth-and-safety.md": safety
  }
};
