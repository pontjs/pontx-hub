import type { Route } from "./+types/agent-skill-discovery";
import { getSkillArchive } from "~/lib/skill-archive.server";
import { sha256 } from "~/lib/skill-bundle.server";
import { getSkillBundle, listSkillSummaries } from "~/lib/product-skills.server";

const BASE_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "X-Content-Type-Options": "nosniff"
};

function artifactFor(name: string) {
  const bundle = getSkillBundle(name);
  if (!bundle) return undefined;
  const archive = getSkillArchive(bundle);
  const digest = sha256(archive);
  return { archive, digest };
}

export function loader({ params, request }: Route.LoaderArgs) {
  const path = params["*"] ?? "";
  const isHead = request.method === "HEAD";
  if (path === "index.json") {
    const skills = listSkillSummaries().map((skill) => {
      const artifact = artifactFor(skill.name);
      if (!artifact) throw new Error(`Skill bundle disappeared while building discovery index: ${skill.name}`);
      return {
        name: skill.name,
        type: "archive",
        description: skill.description,
        url: `/.well-known/agent-skills/${skill.name}.tar.gz`,
        digest: `sha256:${artifact.digest}`
      };
    });
    const body = JSON.stringify({
      $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
      skills
    });
    return new Response(isHead ? null : body, {
      headers: {
        ...BASE_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": String(Buffer.byteLength(body))
      }
    });
  }

  const match = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.tar\.gz$/.exec(path);
  const artifact = match ? artifactFor(match[1]) : undefined;
  if (!artifact) throw new Response("Skill resource not found", { status: 404 });

  return new Response(isHead ? null : new Uint8Array(artifact.archive), {
    headers: {
      ...BASE_HEADERS,
      "Content-Type": "application/gzip",
      "Content-Length": String(artifact.archive.length),
      ETag: `"${artifact.digest}"`
    }
  });
}

export function action({ request }: Route.ActionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: BASE_HEADERS });
  }
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { ...BASE_HEADERS, Allow: "GET, HEAD, OPTIONS" }
  });
}
