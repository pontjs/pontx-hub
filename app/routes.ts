import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/locale-redirect.tsx"),
  route("robots.txt", "routes/robots.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),
  route("api/v1/*", "routes/api.ts"),
  route("api/v2/*", "routes/api-v2.ts"),
  route("api/internal/*", "routes/internal-api.ts"),
  route("api/auth/*", "routes/auth-api.ts"),
  route("api/account/v1/*", "routes/account-api.ts"),
  route("oauth/callback", "routes/oauth-callback.tsx"),
  route(":locale/sign-in/*", "routes/sign-in.tsx"),
  route(":locale/account/saved", "routes/saved-apis.tsx"),
  route(":locale/account/history", "routes/playground-history.tsx"),
  route(":locale", "routes/catalog.tsx"),
  route(":locale/apis", "routes/catalog-redirect.tsx"),
  route(":locale/apis/:apiSlug", "routes/api-detail.tsx"),
  route(
    ":locale/apis/:apiSlug/schemas/:schemaName",
    "routes/schema-detail.tsx"
  ),
  route(
    ":locale/apis/:apiSlug/:operationSlug",
    "routes/operation-detail.tsx"
  ),
  route(":locale/sdks/:apiSlug", "routes/sdk-detail.tsx"),
  route(":locale/agent-skill", "routes/agent-skill.tsx")
] satisfies RouteConfig;
