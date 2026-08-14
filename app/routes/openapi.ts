import { cacheHeaders, siteUrl } from "~/lib/http";

const pathParameter = (name: string) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string" }
});

export function loader() {
  return Response.json({
    openapi: "3.1.0",
    info: {
      title: "Pontx Hub Discovery API",
      version: "2.0.0",
      description: "Search curated public APIs and inspect their OpenAPI Endpoints, Schemas, and published SDK metadata. Use the Pontx Hub CLI and Agent Skill for preview-first execution workflows."
    },
    servers: [{ url: siteUrl("").replace(/\/$/, "") }],
    paths: {
      "/api/v1/catalog": {
        get: {
          operationId: "listApiCatalog",
          summary: "List curated API products",
          responses: { "200": { description: "Curated API summaries" } }
        }
      },
      "/api/v2/search": {
        get: {
          operationId: "searchApiCatalog",
          summary: "Search API products, Endpoints, and Schemas",
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string", minLength: 1 } },
            { name: "locale", in: "query", schema: { type: "string", enum: ["en", "zh"], default: "en" } },
            { name: "types", in: "query", description: "Comma-separated resource types", schema: { type: "string", examples: ["api,endpoint,schema"] } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 30 } },
            { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } }
          ],
          responses: {
            "200": { description: "Ranked search results with stable resource IDs and direct URLs" },
            "422": { description: "Invalid query parameters" }
          }
        }
      },
      "/api/v1/specs/{slug}": {
        get: {
          operationId: "getApiSpec",
          summary: "Inspect one curated API product",
          parameters: [pathParameter("slug")],
          responses: { "200": { description: "API metadata" }, "404": { description: "API not found" } }
        }
      },
      "/api/v1/specs/{slug}/operations/{operationSlug}": {
        get: {
          operationId: "getApiEndpoint",
          summary: "Inspect one API Endpoint",
          parameters: [pathParameter("slug"), pathParameter("operationSlug")],
          responses: { "200": { description: "Endpoint metadata" }, "404": { description: "Endpoint not found" } }
        }
      },
      "/api/v2/specs/{slug}/schemas/{schemaName}": {
        get: {
          operationId: "getApiSchema",
          summary: "Inspect one API Schema",
          parameters: [pathParameter("slug"), pathParameter("schemaName")],
          responses: { "200": { description: "Schema metadata" }, "404": { description: "Schema not found" } }
        }
      },
      "/api/v1/specs/{slug}/sdk": {
        get: {
          operationId: "getApiSdk",
          summary: "Inspect published SDK metadata",
          parameters: [pathParameter("slug")],
          responses: { "200": { description: "SDK package and version metadata" }, "404": { description: "SDK not found" } }
        }
      },
      "/api/v1/skill": {
        get: {
          operationId: "getPontxHubSkillBundle",
          summary: "Download the Pontx Hub Agent Skill bundle",
          responses: { "200": { description: "Versioned Skill files" } }
        }
      }
    }
  }, {
    headers: {
      ...cacheHeaders(3600),
      "X-Robots-Tag": "noindex"
    }
  });
}
