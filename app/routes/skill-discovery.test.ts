import { describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import {
  listSkillSummaries,
  parseProductSkillRegistry,
  productSkillsFromRegistry
} from "~/lib/product-skills.server";
import { sha256, skillContentHash } from "~/lib/skill-bundle.server";
import { loader } from "./skill-discovery";

function registry(overrides: Record<string, unknown> = {}): string {
  const files = [{
    path: "SKILL.md",
    content: "---\nname: pontx-frankfurter\n---\n",
    sha256: sha256("---\nname: pontx-frankfurter\n---\n")
  }];
  return JSON.stringify({
    formatVersion: 1,
    skills: [{
      name: "pontx-frankfurter",
      apiSlug: "frankfurter",
      version: "1.0.0",
      description: "Use Frankfurter exchange-rate workflows through Pontx.",
      license: "MIT-0",
      contentHash: skillContentHash(files),
      files,
      ...overrides
    }]
  });
}

describe("product Skill registry", () => {
  it("accepts the metadata-native registry and preserves verified file content", () => {
    const parsed = parseProductSkillRegistry(registry());
    expect(parsed.skills).toEqual([expect.objectContaining({
      name: "pontx-frankfurter",
      apiSlug: "frankfurter",
      contentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      files: [expect.objectContaining({ path: "SKILL.md" })]
    })]);
  });

  it("rejects unsafe paths, unknown products, and mismatched hashes", () => {
    const unsafeContent = "unsafe";
    expect(() => parseProductSkillRegistry(registry({
      files: [{ path: "../SKILL.md", content: unsafeContent, sha256: sha256(unsafeContent) }],
      contentHash: skillContentHash([{ path: "../SKILL.md", content: unsafeContent }])
    }))).toThrow(/unsafe path/);
    expect(() => parseProductSkillRegistry(registry({
      name: "pontx-not-in-catalog",
      apiSlug: "not-in-catalog"
    }))).toThrow(/not present in the synchronized catalog/);

    const parsed = JSON.parse(registry());
    parsed.skills[0].files[0].content += "tampered";
    expect(() => parseProductSkillRegistry(JSON.stringify(parsed))).toThrow(/sha256 does not match/);
  });

  it("fails closed to no product Skills when a registry is absent or invalid", () => {
    const warn = vi.fn();
    expect(productSkillsFromRegistry(undefined, warn)).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
    expect(productSkillsFromRegistry("{invalid", warn)).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("using the universal Skill only"));
  });
});

describe("well-known Skill discovery", () => {
  it("publishes the same universal-first summaries used by the Hub API", async () => {
    const response = loader({ params: { "*": "index.json" } } as never);
    const payload = await response.json();
    expect(payload.skills).toEqual(listSkillSummaries());
    expect(payload.skills[0].name).toBe("pontx-hub");
    expect(payload.skills[0].files[0]).toEqual({
      path: expect.any(String),
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/)
    });
    if (existsSync(new URL("../../.catalog-cache/skills/registry.json", import.meta.url))) {
      expect(payload.skills.some((skill: { apiSlug?: string }) => skill.apiSlug)).toBe(true);
    }
  });

  it("serves registered files and rejects missing or traversing resources", async () => {
    const response = loader({ params: { "*": "pontx-hub/LICENSE" } } as never);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(await response.text()).toContain("MIT No Attribution");

    for (const path of ["pontx-hub/missing.md", "pontx-hub/../SKILL.md", "../pontx-hub/SKILL.md"]) {
      try {
        loader({ params: { "*": path } } as never);
        throw new Error(`Expected ${path} to be rejected`);
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        expect((error as Response).status).toBe(404);
      }
    }
  });
});
