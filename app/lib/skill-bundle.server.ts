import { createHash } from "node:crypto";
import skill from "../../plugins/pontx-api/skills/pontx-hub/SKILL.md?raw";
import agent from "../../plugins/pontx-api/skills/pontx-hub/agents/openai.yaml?raw";
import license from "../../plugins/pontx-api/skills/pontx-hub/LICENSE?raw";
import safety from "../../plugins/pontx-api/skills/pontx-hub/references/auth-and-safety.md?raw";

export type SkillFile = {
  path: string;
  sha256: string;
  content: string;
};

export type SkillFileSummary = Omit<SkillFile, "content">;

export type PublicSkillBundle = {
  name: string;
  apiSlug?: string;
  version: string;
  description: string;
  license: string;
  contentHash: string;
  files: SkillFile[];
};

export type PublicSkillSummary = Omit<PublicSkillBundle, "files"> & {
  files: SkillFileSummary[];
};

export const PONTX_HUB_SKILL_DESCRIPTION =
  "Discover, compare, inspect, preview, call, and integrate curated public APIs with Pontx Hub. Use whenever a user asks to find a public API for a task, identify which Endpoint or Schema returns a field, inspect PontxSpec or OpenAPI documentation, install provider-specific Skills, preview a request safely, confirm a mutation, or generate code with a published Pontx SDK.";

export const skillBundle = {
  name: "pontx-hub",
  version: "0.5.0",
  files: {
    LICENSE: license,
    "SKILL.md": skill,
    "agents/openai.yaml": agent,
    "references/auth-and-safety.md": safety
  }
};

export function sha256(content: string | Uint8Array): string {
  const hash = createHash("sha256");
  if (typeof content === "string") hash.update(content, "utf8");
  else hash.update(content);
  return hash.digest("hex");
}

export function compareSkillPaths(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

export function skillContentHash(files: Array<Pick<SkillFile, "path" | "content">>): string {
  const hash = createHash("sha256");
  for (const file of [...files].sort((left, right) => compareSkillPaths(left.path, right.path))) {
    hash.update(file.path, "utf8");
    hash.update("\0");
    hash.update(file.content, "utf8");
    hash.update("\0");
  }
  return hash.digest("hex");
}

const universalFiles: SkillFile[] = Object.entries(skillBundle.files)
  .map(([path, content]) => ({ path, sha256: sha256(content), content }))
  .sort((left, right) => compareSkillPaths(left.path, right.path));

export const universalSkillBundle: PublicSkillBundle = {
  name: skillBundle.name,
  version: skillBundle.version,
  description: PONTX_HUB_SKILL_DESCRIPTION,
  license: "MIT-0",
  contentHash: skillContentHash(universalFiles),
  files: universalFiles
};

export const universalSkillSummary: PublicSkillSummary = {
  ...universalSkillBundle,
  files: universalSkillBundle.files.map(({ path, sha256 }) => ({ path, sha256 }))
};
