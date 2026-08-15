import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/locale-redirect.tsx"),
  route("robots.txt", "routes/robots.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),
  route("llms.txt", "routes/llms.ts"),
  route("openapi.json", "routes/openapi.ts"),
  route("badges/sdk/*", "routes/sdk-quality-badge.ts"),
  route(".well-known/skills/*", "routes/skill-discovery.ts"),
  route("docs", "routes/docs-redirect.tsx"),
  route("docs/:docSlug", "routes/docs-detail-redirect.tsx"),
  route("api/v1/*", "routes/api.ts"),
  route("api/v2/*", "routes/api-v2.ts"),
  route("api/internal/*", "routes/internal-api.ts"),
  route("api/auth/*", "routes/auth-api.ts"),
  route("api/account/v1/*", "routes/account-api.ts"),
  route("api/ai/v1/*", "routes/ai-api.ts"),
  route("oauth/callback", "routes/oauth-callback.tsx"),
  route(":locale/sign-in/*", "routes/sign-in.tsx"),
  route(":locale/account/saved", "routes/saved-apis.tsx"),
  route(":locale/account/history", "routes/playground-history.tsx"),
  route(":locale", "routes/catalog.tsx"),
  route(":locale/docs", "routes/docs-index.tsx"),
  route(":locale/docs/:docSlug", "routes/docs-detail.tsx"),
  route(":locale/apis", "routes/catalog-redirect.tsx"),
  route(":locale/apis/:apiSlug", "routes/api-layout.tsx", [
    index("routes/api-detail.tsx"),
    route("schemas/:schemaName", "routes/schema-detail.tsx"),
    route("endpoints/:operationSlug", "routes/endpoint-legacy-redirect.tsx"),
    route(":operationSlug", "routes/operation-detail.tsx")
  ]),
  route(":locale/sdks/:apiSlug", "routes/sdk-detail.tsx"),
  route(":locale/agent-skill", "routes/agent-skill-redirect.tsx"),
  route(":locale/skills", "routes/skills-index.tsx"),
  route(":locale/skills/pontx-hub", "routes/agent-skill.tsx"),
  route(":locale/skills/:skillName", "routes/product-skill.tsx")
] satisfies RouteConfig;
