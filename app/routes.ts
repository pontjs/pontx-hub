import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/locale-redirect.tsx"),
  route("robots.txt", "routes/robots.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),
  route("api/v1/*", "routes/api.ts"),
  route("api/internal/*", "routes/internal-api.ts"),
  route(":locale", "routes/catalog.tsx"),
  route(":locale/apis", "routes/catalog-redirect.tsx"),
  route(":locale/apis/:apiSlug", "routes/api-detail.tsx"),
  route(
    ":locale/apis/:apiSlug/:operationSlug",
    "routes/operation-detail.tsx"
  ),
  route(":locale/sdks/:apiSlug", "routes/sdk-detail.tsx"),
  route(":locale/agent-skill", "routes/agent-skill.tsx")
] satisfies RouteConfig;
