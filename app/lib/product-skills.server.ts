import { getCatalogApi } from "~/lib/catalog/catalog.server";
import {
  compareSkillPaths,
  skillContentHash,
  sha256,
  universalSkillBundle,
  universalSkillSummary,
  type PublicSkillBundle,
  type PublicSkillSummary,
  type SkillFile
} from "~/lib/skill-bundle.server";

const rawRegistryFiles = import.meta.glob(
  "../../.catalog-cache/skills/registry.json",
  { eager: true, import: "default", query: "?raw" }
) as Record<string, string>;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const shaPattern = /^[a-f0-9]{64}$/;

type ProductSkillRegistry = {
  formatVersion: 1;
  skills: PublicSkillBundle[];
};

let productSkillsCache: PublicSkillBundle[] | undefined;

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

export function isSafeSkillPath(path: string): boolean {
  if (!path || path.length > 512 || path.startsWith("/") || path.includes("\\") || path.includes("\0")) {
    return false;
  }
  const parts = path.split("/");
  return parts.every((part) => part.length > 0 && part !== "." && part !== "..");
}

function parseFile(value: unknown, skillName: string, index: number): SkillFile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${skillName}: files[${index}] must be an object`);
  }
  const file = value as Record<string, unknown>;
  if (!hasExactKeys(file, ["path", "sha256", "content"])) {
    throw new Error(`${skillName}: files[${index}] has unsupported fields`);
  }
  if (typeof file.path !== "string" || !isSafeSkillPath(file.path)) {
    throw new Error(`${skillName}: files[${index}] has an unsafe path`);
  }
  if (typeof file.content !== "string") {
    throw new Error(`${skillName}: ${file.path} content must be a string`);
  }
  if (typeof file.sha256 !== "string" || !shaPattern.test(file.sha256)) {
    throw new Error(`${skillName}: ${file.path} has an invalid sha256`);
  }
  if (sha256(file.content) !== file.sha256) {
    throw new Error(`${skillName}: ${file.path} sha256 does not match its content`);
  }
  return file as SkillFile;
}

function parseSkill(value: unknown, index: number): PublicSkillBundle {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`skills/registry.json skills[${index}] must be an object`);
  }
  const skill = value as Record<string, unknown>;
  if (!hasExactKeys(skill, [
    "name",
    "apiSlug",
    "version",
    "description",
    "license",
    "contentHash",
    "files"
  ])) {
    throw new Error(`skills/registry.json skills[${index}] has unsupported fields`);
  }
  if (typeof skill.apiSlug !== "string" || !slugPattern.test(skill.apiSlug)) {
    throw new Error(`skills/registry.json skills[${index}] has an invalid apiSlug`);
  }
  if (skill.name !== `pontx-${skill.apiSlug}`) {
    throw new Error(`${skill.apiSlug}: product Skill name must be pontx-${skill.apiSlug}`);
  }
  if (!getCatalogApi(skill.apiSlug)) {
    throw new Error(`${skill.name}: apiSlug is not present in the synchronized catalog`);
  }
  if (typeof skill.version !== "string" || !semverPattern.test(skill.version)) {
    throw new Error(`${skill.name}: version must be valid SemVer`);
  }
  if (typeof skill.description !== "string" || !skill.description.trim() || skill.description.length > 300) {
    throw new Error(`${skill.name}: description must contain at most 300 characters`);
  }
  if (typeof skill.license !== "string" || !skill.license.trim()) {
    throw new Error(`${skill.name}: license must be a non-empty string`);
  }
  if (typeof skill.contentHash !== "string" || !shaPattern.test(skill.contentHash)) {
    throw new Error(`${skill.name}: contentHash must be a lowercase SHA-256 digest`);
  }
  if (!Array.isArray(skill.files) || skill.files.length === 0) {
    throw new Error(`${skill.name}: files must be a non-empty array`);
  }
  const files = skill.files.map((file, fileIndex) => parseFile(file, skill.name as string, fileIndex));
  const paths = files.map((file) => file.path);
  if (new Set(paths).size !== paths.length) {
    throw new Error(`${skill.name}: files contain duplicate paths`);
  }
  const sortedPaths = [...paths].sort(compareSkillPaths);
  if (JSON.stringify(paths) !== JSON.stringify(sortedPaths)) {
    throw new Error(`${skill.name}: files must be sorted by path`);
  }
  if (!paths.includes("SKILL.md")) {
    throw new Error(`${skill.name}: files must include SKILL.md`);
  }
  if (skillContentHash(files) !== skill.contentHash) {
    throw new Error(`${skill.name}: contentHash does not match its files`);
  }

  return {
    name: skill.name,
    apiSlug: skill.apiSlug,
    version: skill.version,
    description: skill.description,
    license: skill.license,
    contentHash: skill.contentHash,
    files
  } as PublicSkillBundle;
}

export function parseProductSkillRegistry(raw: string): ProductSkillRegistry {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `skills/registry.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("skills/registry.json must be an object");
  }
  const registry = value as Record<string, unknown>;
  if (!hasExactKeys(registry, ["formatVersion", "skills"])) {
    throw new Error("skills/registry.json may contain only formatVersion and skills");
  }
  if (registry.formatVersion !== 1 || !Array.isArray(registry.skills)) {
    throw new Error("Unsupported product Skill registry format");
  }
  const skills = registry.skills.map(parseSkill);
  const names = skills.map((skill) => skill.name);
  const apiSlugs = skills.map((skill) => skill.apiSlug);
  if (new Set(names).size !== names.length || new Set(apiSlugs).size !== apiSlugs.length) {
    throw new Error("skills/registry.json contains duplicate product Skills");
  }
  return { formatVersion: 1, skills };
}

export function productSkillsFromRegistry(
  raw: string | undefined,
  warn: (message: string) => void = console.warn
): PublicSkillBundle[] {
  if (raw === undefined) return [];
  try {
    return parseProductSkillRegistry(raw).skills
      .sort((left, right) => compareSkillPaths(left.name, right.name));
  } catch (error) {
    warn(
      `Product Skill registry is invalid; using the universal Skill only: ${error instanceof Error ? error.message : String(error)}`
    );
    return [];
  }
}

function listProductSkillBundles(): PublicSkillBundle[] {
  if (productSkillsCache) return productSkillsCache;
  const rawFiles = Object.values(rawRegistryFiles);
  if (rawFiles.length === 0) {
    console.warn("Product Skill registry is unavailable; using the universal Skill only.");
    productSkillsCache = [];
    return productSkillsCache;
  }
  if (rawFiles.length !== 1) {
    console.warn("Metadata cache contains multiple product Skill registries; using the universal Skill only.");
    productSkillsCache = [];
    return productSkillsCache;
  }
  productSkillsCache = productSkillsFromRegistry(rawFiles[0]);
  return productSkillsCache;
}

export function listSkillSummaries(): PublicSkillSummary[] {
  return [
    universalSkillSummary,
    ...listProductSkillBundles().map((skill) => ({
      ...skill,
      files: skill.files.map(({ path, sha256 }) => ({ path, sha256 }))
    }))
  ];
}

export function getSkillBundle(name: string): PublicSkillBundle | undefined {
  if (name === universalSkillBundle.name) return universalSkillBundle;
  return listProductSkillBundles().find((skill) => skill.name === name);
}
