import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { skillBundle } from "./skill-bundle.server";

describe("universal Skill publishing workflow", () => {
  it("pins the public contract and validates both distribution channels", async () => {
    const source = await readFile(
      new URL("../../.github/workflows/skill-publish.yml", import.meta.url),
      "utf8"
    );
    const workflow = parse(source) as {
      env: Record<string, string | number>;
      jobs: Record<string, { steps: Array<{ name?: string; run?: string }> }>;
    };

    expect(String(workflow.env.CLAWHUB_CLI_VERSION)).toBe("0.23.1");
    expect(workflow.env.SKILL_NAME).toBe(skillBundle.name);
    expect(String(workflow.env.SKILL_VERSION)).toBe(skillBundle.version);

    const install = workflow.jobs["validate-and-install"].steps
      .find((step) => step.name === "Verify a clean skills.sh-compatible install")?.run;
    expect(install).toContain("skills@latest add");
    expect(install).toContain("pontjs/pontx-hub");
    expect(install).toContain("cmp");

    const publish = workflow.jobs.clawhub.steps
      .find((step) => step.name === "Publish or verify the exact immutable version")?.run;
    expect(publish).toContain('--version "$SKILL_VERSION"');
    expect(publish).toContain("sha256sum");
    expect(publish).toContain("diff -u");
    expect(publish).toContain("wait_for_remote");
    expect(publish).toContain(".owner.handle");
    expect(publish).toContain(".skill.slug");
    expect(publish).toContain("--dry-run");
    expect(publish).toContain("--source-commit");

    const authenticate = workflow.jobs.clawhub.steps
      .find((step) => step.name === "Authenticate for a real publish")?.run;
    expect(authenticate).toContain("CLAWHUB_TOKEN is not configured");
  });
});
