import { listCatalog } from "~/lib/catalog/catalog.server";
import { cacheHeaders, siteUrl } from "~/lib/http";

export function loader() {
  const apiLinks = listCatalog().map((api) =>
    `- [${api.title.en}](${siteUrl(`/en/apis/${api.slug}`)}): ${api.summary.en}`
  );
  const sdkLinks = listCatalog()
    .filter((api) => api.sdkStatus === "published")
    .map((api) =>
      `- [${api.packageName}](${siteUrl(`/en/sdks/${api.slug}`)}): Published TypeScript and Node.js SDK for ${api.title.en}.`
    );

  const body = `# Pontx API

> Pontx API helps developers and AI agents discover curated public APIs, inspect OpenAPI Endpoints and Schemas, safely preview requests, and generate type-safe SDK integrations.

## Primary documentation

- [English API catalog](${siteUrl("/en")})
- [中文 API 目录](${siteUrl("/zh")})
- [English Pontx Hub documentation](${siteUrl("/en/docs")})
- [中文 Pontx Hub 文档](${siteUrl("/zh/docs")})
- [Pontx Hub Agent Skill](${siteUrl("/en/skills/pontx-hub")})
- [Agent Skills discovery index](${siteUrl("/.well-known/skills/index.json")})
- [Pontx Hub OpenAPI description](${siteUrl("/openapi.json")})
- [Pontx Hub CLI](https://github.com/pontjs/pontx-hub-cli)
- [Pontx source](https://github.com/pontjs/pontx)

## Curated APIs

${apiLinks.join("\n")}

## Published SDKs

${sdkLinks.join("\n")}

## Agent guidance

Install the universal skill with \`npx skills add https://github.com/pontjs/pontx-hub --skill pontx-hub\`. Search before selecting an API, preview every request, and require explicit user confirmation before any mutation.
`;

  return new Response(body, {
    headers: {
      ...cacheHeaders(3600),
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
