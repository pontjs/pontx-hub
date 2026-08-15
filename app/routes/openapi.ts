import { cacheHeaders, siteUrl } from "~/lib/http";

const pathParameter = (name: string) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string" }
});

const localeParameter = {
  name: "locale",
  in: "query",
  schema: { type: "string", enum: ["en", "zh"], default: "en" }
};

export function loader() {
  return Response.json({
    openapi: "3.1.0",
    info: {
      title: "Pontx Hub Discovery API",
      version: "2.3.0",
      description: "Search curated public APIs, inspect PontxSpec Endpoints, Schemas, and SDKs, and install the universal or product-specific Agent Skills. Use the Pontx Hub CLI for preview-first execution workflows."
    },
    servers: [{ url: siteUrl("").replace(/\/$/, "") }],
    security: [],
    paths: {
      "/api/v1/catalog": {
        get: {
          operationId: "listApiCatalog",
          summary: "List curated API products",
          responses: { "200": { description: "Curated API summaries" } }
        }
      },
      "/api/v2/products": {
        get: {
          operationId: "listProducts",
          summary: "List compact API product metadata",
          description: "Returns product identity, counts, authentication types, and SDK status without Endpoint or Schema details.",
          responses: {
            "200": {
              description: "Compact product list",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ProductListEnvelope" } } }
            }
          }
        }
      },
      "/api/v2/products/{slug}": {
        get: {
          operationId: "getProductSummary",
          summary: "Get one product overview and resource directory",
          description: "Returns product metadata plus navigation-sized Endpoint and Schema summaries. Request/response bodies and JSON Schemas are intentionally excluded.",
          parameters: [pathParameter("slug")],
          responses: {
            "200": {
              description: "Product overview with Endpoint and Schema summaries",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ProductSummaryEnvelope" } } }
            },
            "404": { description: "Product not found" }
          }
        }
      },
      "/api/v2/products/{slug}/endpoints/{endpointSlug}": {
        get: {
          operationId: "getEndpointMetadata",
          summary: "Get one Endpoint's complete metadata",
          description: "Returns the selected Endpoint and a localized PontxSpec fragment containing its transitive Schema closure and the compact product directory.",
          parameters: [pathParameter("slug"), pathParameter("endpointSlug"), localeParameter],
          responses: {
            "200": {
              description: "Endpoint detail and localized PontxSpec fragment",
              content: { "application/json": { schema: { $ref: "#/components/schemas/EndpointDetailEnvelope" } } }
            },
            "404": { description: "Endpoint not found" },
            "422": { description: "Invalid locale" }
          }
        }
      },
      "/api/v2/products/{slug}/schemas/{schemaName}": {
        get: {
          operationId: "getSchemaMetadata",
          summary: "Get one Schema's complete metadata",
          description: "Returns the selected Schema and a localized PontxSpec fragment containing its transitive Schema closure and the compact product directory.",
          parameters: [pathParameter("slug"), pathParameter("schemaName"), localeParameter],
          responses: {
            "200": {
              description: "Schema detail and localized PontxSpec fragment",
              content: { "application/json": { schema: { $ref: "#/components/schemas/SchemaDetailEnvelope" } } }
            },
            "404": { description: "Schema not found" },
            "422": { description: "Invalid locale" }
          }
        }
      },
      "/api/v2/products/{slug}/metadata": {
        get: {
          operationId: "getFullProductMetadata",
          summary: "Get all metadata for one product",
          description: "Returns the full bilingual product catalog record and the complete PontxSpec in the requested locale. Intended for agents, offline indexing, and bulk tooling rather than page navigation.",
          parameters: [pathParameter("slug"), localeParameter],
          responses: {
            "200": {
              description: "Complete product metadata and PontxSpec",
              content: { "application/json": { schema: { $ref: "#/components/schemas/FullProductMetadataEnvelope" } } }
            },
            "404": { description: "Product not found" },
            "422": { description: "Invalid locale" }
          }
        }
      },
      "/api/v2/search": {
        get: {
          operationId: "searchApiCatalog",
          summary: "Search API products, Endpoints, and Schemas",
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string", minLength: 1 } },
            localeParameter,
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
      "/api/v1/specs/{slug}/pricing": {
        get: {
          operationId: "getApiPricing",
          summary: "Inspect reviewed API pricing",
          description: "Returns reviewed pricing metadata, or an explicit unknown status when no reviewed pricing is available.",
          parameters: [pathParameter("slug")],
          responses: {
            "200": {
              description: "Reviewed pricing metadata or an explicit unknown status",
              content: { "application/json": { schema: { $ref: "#/components/schemas/PricingEnvelope" } } }
            },
            "404": { description: "API not found" }
          }
        }
      },
      "/api/v1/skill": {
        get: {
          operationId: "getPontxHubSkillBundle",
          summary: "Download the Pontx Hub Agent Skill bundle",
          responses: { "200": { description: "Versioned Skill files" } }
        }
      },
      "/api/v1/skills": {
        get: {
          operationId: "listPontxSkills",
          summary: "List the universal and published product Skills",
          responses: {
            "200": {
              description: "Skill summaries without file contents",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["version", "data"],
                    properties: {
                      version: { const: "v1" },
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/SkillSummary" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/skills/{name}": {
        get: {
          operationId: "getPontxSkillBundle",
          summary: "Download one verified Skill bundle",
          parameters: [pathParameter("name")],
          responses: {
            "200": {
              description: "Skill manifest and UTF-8 file contents",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["version", "data"],
                    properties: {
                      version: { const: "v1" },
                      data: { $ref: "#/components/schemas/SkillBundle" }
                    }
                  }
                }
              }
            },
            "404": { description: "Skill not found" }
          }
        }
      }
    },
    components: {
      schemas: {
        LocalizedText: {
          type: "object",
          additionalProperties: false,
          required: ["zh", "en"],
          properties: { zh: { type: "string" }, en: { type: "string" } }
        },
        ProductListItem: {
          type: "object",
          required: ["id", "slug", "name", "provider", "title", "summary", "endpointCount", "schemaCount", "authTypes", "sdk"],
          properties: {
            id: { type: "string", pattern: "^api:" },
            slug: { type: "string" },
            name: { type: "string" },
            provider: { type: "string" },
            title: { $ref: "#/components/schemas/LocalizedText" },
            summary: { $ref: "#/components/schemas/LocalizedText" },
            endpointCount: { type: "integer", minimum: 0 },
            schemaCount: { type: "integer", minimum: 0 },
            defaultEndpointSlug: { type: "string" },
            authTypes: { type: "array", items: { type: "string", enum: ["apiKey", "bearer", "oauth2", "basic"] } },
            sdk: { type: "object", additionalProperties: true }
          }
        },
        ProductListEnvelope: {
          type: "object",
          required: ["version", "metadataRevision", "data"],
          properties: {
            version: { const: "v2" },
            metadataRevision: { type: "string", pattern: "^[a-f0-9]{40}$" },
            data: { type: "array", items: { $ref: "#/components/schemas/ProductListItem" } }
          }
        },
        EndpointSummary: {
          type: "object",
          required: ["id", "slug", "operationId", "style", "tag", "title"],
          properties: {
            id: { type: "string", pattern: "^endpoint:" },
            slug: { type: "string" },
            operationId: { type: "string" },
            style: { type: "string", enum: ["RESTFul", "RPC", "GraphQL", "AsyncAPI"] },
            tag: { type: "string" },
            method: { type: "string" },
            path: { type: "string" },
            title: { $ref: "#/components/schemas/LocalizedText" },
            deprecated: { type: "boolean" }
          }
        },
        SchemaSummary: {
          type: "object",
          required: ["id", "name", "title", "type", "propertyCount"],
          properties: {
            id: { type: "string", pattern: "^schema:" },
            name: { type: "string" },
            title: { $ref: "#/components/schemas/LocalizedText" },
            type: { type: "string", enum: ["string", "number", "integer", "boolean", "object", "array"] },
            propertyCount: { type: "integer", minimum: 0 }
          }
        },
        ProductSummaryEnvelope: {
          type: "object",
          required: ["version", "metadataRevision", "data"],
          properties: {
            version: { const: "v2" },
            metadataRevision: { type: "string", pattern: "^[a-f0-9]{40}$" },
            data: {
              type: "object",
              required: ["id", "slug", "endpointCount", "schemaCount", "endpoints", "schemas"],
              properties: {
                id: { type: "string", pattern: "^api:" },
                slug: { type: "string" },
                endpointCount: { type: "integer", minimum: 0 },
                schemaCount: { type: "integer", minimum: 0 },
                endpoints: { type: "array", items: { $ref: "#/components/schemas/EndpointSummary" } },
                schemas: { type: "array", items: { $ref: "#/components/schemas/SchemaSummary" } }
              },
              additionalProperties: true
            }
          }
        },
        EndpointDetailEnvelope: {
          type: "object",
          required: ["version", "metadataRevision", "data"],
          properties: {
            version: { const: "v2" },
            metadataRevision: { type: "string", pattern: "^[a-f0-9]{40}$" },
            data: {
              type: "object",
              required: ["locale", "product", "endpoint", "pontxSpec"],
              properties: {
                locale: { type: "string", enum: ["en", "zh"] },
                product: { $ref: "#/components/schemas/ProductListItem" },
                endpoint: { type: "object", additionalProperties: true },
                pontxSpec: { type: "object", additionalProperties: true }
              }
            }
          }
        },
        SchemaDetailEnvelope: {
          type: "object",
          required: ["version", "metadataRevision", "data"],
          properties: {
            version: { const: "v2" },
            metadataRevision: { type: "string", pattern: "^[a-f0-9]{40}$" },
            data: {
              type: "object",
              required: ["locale", "product", "schema", "pontxSpec"],
              properties: {
                locale: { type: "string", enum: ["en", "zh"] },
                product: { $ref: "#/components/schemas/ProductListItem" },
                schema: { type: "object", additionalProperties: true },
                pontxSpec: { type: "object", additionalProperties: true }
              }
            }
          }
        },
        FullProductMetadataEnvelope: {
          type: "object",
          required: ["version", "metadataRevision", "data"],
          properties: {
            version: { const: "v2" },
            metadataRevision: { type: "string", pattern: "^[a-f0-9]{40}$" },
            data: {
              type: "object",
              required: ["locale", "product", "pontxSpec"],
              properties: {
                locale: { type: "string", enum: ["en", "zh"] },
                product: { type: "object", additionalProperties: true },
                pontxSpec: { type: "object", additionalProperties: true }
              }
            }
          }
        },
        PricingEnvelope: {
          type: "object",
          additionalProperties: false,
          required: ["version", "data"],
          properties: {
            version: { const: "v1" },
            data: {
              type: "object",
              additionalProperties: false,
              required: ["status", "summary"],
              properties: {
                status: { type: "string", enum: ["free", "freemium", "paid", "contact", "unknown"] },
                summary: { $ref: "#/components/schemas/LocalizedText" },
                officialUrl: { type: "string", format: "uri" },
                verifiedAt: { type: "string", format: "date" },
                currency: { type: "string" },
                freeTier: { $ref: "#/components/schemas/LocalizedText" },
                billingUnit: { $ref: "#/components/schemas/LocalizedText" },
                startingPrice: {
                  type: "object",
                  additionalProperties: false,
                  required: ["amount", "currency", "unit"],
                  properties: {
                    amount: { type: "number" },
                    currency: { type: "string" },
                    unit: { $ref: "#/components/schemas/LocalizedText" }
                  }
                }
              }
            }
          }
        },
        SkillFileSummary: {
          type: "object",
          additionalProperties: false,
          required: ["path", "sha256"],
          properties: {
            path: { type: "string", examples: ["SKILL.md"] },
            sha256: { type: "string", pattern: "^[a-f0-9]{64}$" }
          }
        },
        SkillFile: {
          type: "object",
          additionalProperties: false,
          required: ["path", "sha256", "content"],
          properties: {
            path: { type: "string", examples: ["SKILL.md"] },
            sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
            content: { type: "string" }
          }
        },
        SkillSummary: {
          type: "object",
          additionalProperties: false,
          required: ["name", "version", "description", "license", "contentHash", "files"],
          properties: {
            name: { type: "string" },
            apiSlug: { type: "string", description: "Present only for a product Skill" },
            version: { type: "string" },
            description: { type: "string" },
            license: { type: "string" },
            contentHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
            files: {
              type: "array",
              items: { $ref: "#/components/schemas/SkillFileSummary" }
            }
          }
        },
        SkillBundle: {
          type: "object",
          additionalProperties: false,
          required: ["name", "version", "description", "license", "contentHash", "files"],
          properties: {
            name: { type: "string" },
            apiSlug: { type: "string", description: "Present only for a product Skill" },
            version: { type: "string" },
            description: { type: "string" },
            license: { type: "string" },
            contentHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
            files: {
              type: "array",
              items: { $ref: "#/components/schemas/SkillFile" }
            }
          }
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
