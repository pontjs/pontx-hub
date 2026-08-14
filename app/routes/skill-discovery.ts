import type { Route } from "./+types/skill-discovery";
import {
  PONTX_HUB_SKILL_DESCRIPTION,
  skillBundle
} from "~/lib/skill-bundle.server";

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
    return json({
      skills: [{
        name: skillBundle.name,
        description: PONTX_HUB_SKILL_DESCRIPTION,
        files: Object.keys(skillBundle.files)
      }]
    });
  }

  const [skillName, ...fileParts] = path.split("/");
  const filePath = fileParts.join("/");
  if (skillName !== skillBundle.name || !filePath) {
    throw new Response("Skill resource not found", { status: 404 });
  }
  const content = skillBundle.files[filePath as keyof typeof skillBundle.files];
  if (content === undefined) {
    throw new Response("Skill resource not found", { status: 404 });
  }

  const contentType = filePath.endsWith(".yaml")
    ? "application/yaml; charset=utf-8"
    : "text/markdown; charset=utf-8";
  return new Response(content, {
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
