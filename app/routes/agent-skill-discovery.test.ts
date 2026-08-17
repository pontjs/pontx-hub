import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { sha256 } from "~/lib/skill-bundle.server";
import { listSkillSummaries } from "~/lib/product-skills.server";
import { action, loader } from "./agent-skill-discovery";

function request(path: string, method = "GET") {
  return {
    params: { "*": path },
    request: new Request(`https://pontx.dev/.well-known/agent-skills/${path}`, { method })
  } as never;
}

function tarPaths(tar: Buffer): string[] {
  const paths: string[] = [];
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const path = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const size = Number.parseInt(header.subarray(124, 136).toString("ascii").replace(/\0.*$/, "").trim(), 8);
    paths.push(path);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return paths;
}

describe("Agent Skills Discovery v0.2", () => {
  it("publishes archive entries with verifiable SHA-256 digests", async () => {
    const indexResponse = loader(request("index.json"));
    const index = await indexResponse.json() as {
      $schema: string;
      skills: Array<{ name: string; type: string; url: string; digest: string }>;
    };

    expect(index.$schema).toBe("https://schemas.agentskills.io/discovery/0.2.0/schema.json");
    expect(index.skills).toHaveLength(listSkillSummaries().length);
    expect(index.skills[0]).toEqual(expect.objectContaining({
      name: "pontx-hub",
      type: "archive",
      url: "/.well-known/agent-skills/pontx-hub.tar.gz",
      digest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/)
    }));

    const archiveResponse = loader(request("pontx-hub.tar.gz"));
    const archive = Buffer.from(await archiveResponse.arrayBuffer());
    expect(archiveResponse.headers.get("Content-Type")).toBe("application/gzip");
    expect(index.skills[0].digest).toBe(`sha256:${sha256(archive)}`);
    expect(tarPaths(gunzipSync(archive))).toEqual(expect.arrayContaining([
      "SKILL.md",
      "LICENSE",
      "agents/openai.yaml",
      "references/auth-and-safety.md"
    ]));
  });

  it("supports HEAD and CORS preflight without returning an artifact body", async () => {
    const headResponse = loader(request("pontx-hub.tar.gz", "HEAD"));
    expect(headResponse.status).toBe(200);
    expect(headResponse.headers.get("Content-Length")).toMatch(/^\d+$/);
    expect((await headResponse.arrayBuffer()).byteLength).toBe(0);

    const optionsResponse = action({
      request: new Request("https://pontx.dev/.well-known/agent-skills/index.json", { method: "OPTIONS" })
    } as never);
    expect(optionsResponse.status).toBe(204);
    expect(optionsResponse.headers.get("Access-Control-Allow-Methods")).toBe("GET, HEAD, OPTIONS");
  });

  it("rejects unknown artifacts", () => {
    expect(() => loader(request("missing.tar.gz"))).toThrow(expect.objectContaining({ status: 404 }));
    expect(() => loader(request("../pontx-hub.tar.gz"))).toThrow(expect.objectContaining({ status: 404 }));
  });
});
