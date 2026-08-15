import type { Route } from "./+types/skill-discovery";
import {
  getSkillBundle,
  isSafeSkillPath,
  listSkillSummaries
} from "~/lib/product-skills.server";

const BASE_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
};

function json(value: unknown) {
  return Response.json(value, {
    headers: { ...BASE_HEADERS, "Content-Type": "application/json; charset=utf-8" }
  });
}

export function loader({ params }: Route.LoaderArgs) {
  const path = params["*"] ?? "";
  if (path === "index.json") {
    return json({ skills: listSkillSummaries() });
  }

  const [skillName, ...fileParts] = path.split("/");
  const filePath = fileParts.join("/");
  if (!skillName || !isSafeSkillPath(filePath)) {
    throw new Response("Skill resource not found", { status: 404 });
  }
  const bundle = getSkillBundle(skillName);
  const file = bundle?.files.find((candidate) => candidate.path === filePath);
  if (!file) {
    throw new Response("Skill resource not found", { status: 404 });
  }

  const contentType = filePath.endsWith(".yaml") || filePath.endsWith(".yml")
    ? "application/yaml; charset=utf-8"
    : filePath.endsWith(".json")
      ? "application/json; charset=utf-8"
      : filePath.endsWith(".md")
        ? "text/markdown; charset=utf-8"
        : "text/plain; charset=utf-8";
  return new Response(file.content, {
    headers: { ...BASE_HEADERS, "Content-Type": contentType }
  });
}

export function action({ request }: Route.ActionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: BASE_HEADERS });
  }
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { ...BASE_HEADERS, Allow: "GET, OPTIONS" }
  });
}
