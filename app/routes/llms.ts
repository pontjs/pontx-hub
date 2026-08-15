import { listCatalog } from "~/lib/catalog/catalog.server";
import { cacheHeaders, siteUrl } from "~/lib/http";
import { listSkillSummaries } from "~/lib/product-skills.server";

export function loader() {
  const apiLinks = listCatalog().map((api) =>
    `- [${api.title.en}](${siteUrl(`/en/apis/${api.slug}`)}): ${api.summary.en}`
  );
  const sdkLinks = listCatalog()
    .filter((api) => api.sdkStatus === "published")
    .map((api) =>
      `- [${api.packageName}](${siteUrl(`/en/sdks/${api.slug}`)}): Published package in the Unified SDK for ${api.title.en}.`
    );
  const skillLinks = listSkillSummaries().map((skill) =>
    `- [${skill.name}](${siteUrl(`/en/skills/${skill.name}`)}): ${skill.description}`
  );

  const body = `# Pontx API

> Pontx API helps developers and AI agents discover curated public APIs, inspect canonical PontxSpec Endpoints and Schemas, safely preview supported requests, and generate type-safe SDK integrations.

## Primary documentation

- [English API catalog](${siteUrl("/en")})
- [中文 API 目录](${siteUrl("/zh")})
- [English Pontx Hub documentation](${siteUrl("/en/docs")})
- [中文 Pontx Hub 文档](${siteUrl("/zh/docs")})
- [English Skills directory](${siteUrl("/en/skills")})
- [中文 Skills 目录](${siteUrl("/zh/skills")})
- [Pontx Hub Agent Skill](${siteUrl("/en/skills/pontx-hub")})
- [Agent Skills discovery index](${siteUrl("/.well-known/skills/index.json")})
- [Pontx Hub OpenAPI description](${siteUrl("/openapi.json")})
- [Pontx Hub CLI](https://github.com/pontjs/pontx-hub-cli)
- [Pontx source](https://github.com/pontjs/pontx)

## Curated APIs

${apiLinks.join("\n")}

## Unified SDK packages

${sdkLinks.join("\n")}

## Agent Skills

${skillLinks.join("\n")}

## Agent guidance

Install the universal Skill first with \`pontx-hub skill install\`. Use \`pontx-hub skill list\` and \`pontx-hub skill install <api-slug>\` to add a concise product playbook when provider-specific integration guidance is useful. Search the live catalog instead of copying Endpoint, parameter, or Schema metadata into long-lived context. Preview every request, and require explicit user confirmation before any mutation.
`;

  return new Response(body, {
    headers: {
      ...cacheHeaders(3600),
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
