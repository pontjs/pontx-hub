import { describe, expect, it } from "vitest";
import { loadPontxSpec } from "@pontx/spec";
import { getPlaygroundAvailability } from "../playground/availability";
import { buildSearchResponse } from "./search";
import { catalogApiSchema } from "./schema";
import { buildCatalogApi } from "./hierarchy";
import { pontxApiView } from "./pontx-view";

const baseSpec = loadPontxSpec({
  pontx: "2.1",
  style: "RPC",
  rpc: { protocol: "fixture-rpc" },
  name: "rpc-minimal",
  info: { title: "最小 RPC", version: "1.0.0" },
  security: [{ fixtureKey: [] }],
  apis: {
    "inventory/getItem": {
      operationId: "getItem",
      rpc: { action: "inventory.getItem" },
      summary: "获取库存项目",
      description: "通过 RPC 标识读取一个项目。",
      tags: ["inventory"],
      parameters: [{ name: "id", in: "body", required: true, schema: { type: "string" } }],
      responses: {
        success: { description: "项目结果", schema: { $ref: "#/components/schemas/Item" } }
      },
      requestExamples: {
        default: { request: { body: "item-1" }, expectedStatus: "success" }
      }
    }
  },
  tags: [{ name: "inventory", description: "库存方法" }],
  components: {
    securitySchemes: {
      fixtureKey: {
        type: "apiKey",
        in: "header",
        name: "x-fixture-key",
        description: "调用方的测试密钥。"
      }
    },
    schemas: {
      Item: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", description: "项目 ID" } }
      }
    }
  }
});

const localizedSpec = loadPontxSpec({
  ...baseSpec,
  info: { ...baseSpec.info, title: "Minimal RPC" },
  apis: {
    "inventory/getItem": {
      ...baseSpec.apis["inventory/getItem"],
      summary: "Get inventory item",
      description: "Reads one item by its RPC identifier.",
      responses: { success: { description: "Item result", schema: { $ref: "#/components/schemas/Item" } } }
    }
  },
  tags: [{ name: "inventory", description: "Inventory methods" }],
  components: {
    securitySchemes: {
      fixtureKey: {
        type: "apiKey",
        in: "header",
        name: "x-fixture-key",
        description: "Caller-owned fixture key."
      }
    },
    schemas: {
      Item: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", description: "Item ID" } }
      }
    }
  }
});

const api = buildCatalogApi({
  metadataCommit: "a".repeat(40),
  product: {
    slug: "rpc-minimal",
    name: "Minimal RPC",
    provider: "Pontx",
    category: "Fixture",
    featured: false,
    display: { title: "最小 RPC API", summary: "验证非 HTTP 索引。", accent: "#334155" },
    legal: { license: "MIT", attributionUrl: "https://pontx.dev/" },
    documentation: { status: "official", evidence: ["https://pontx.dev/"], verifiedAt: "2026-08-15" },
    credentials: [{
      schemeId: "fixtureKey",
      envVar: "PONTX_FIXTURE_KEY",
      description: "调用方的测试密钥。",
      guide: {
        url: "https://pontx.dev/keys",
        title: "获取测试密钥",
        steps: ["打开密钥页面。"]
      }
    }],
    quickStart: { operationId: "getItem", requestExampleId: "default" }
  },
  localizedProduct: {
    display: { title: "Minimal RPC API", summary: "Verifies non-HTTP indexing." },
    credentials: [{
      schemeId: "fixtureKey",
      description: "Caller-owned fixture key.",
      guide: {
        title: "Get a fixture key",
        steps: ["Open the key dashboard."]
      }
    }]
  },
  spec: baseSpec,
  localizedSpec,
  sdk: {
    package: { name: "@pontx/rpc-minimal", version: "0.0.0", status: "planned" },
    contract: {
      client: { kind: "named", identifier: "rpcMinimalClient" },
      controllers: { inventory: "inventory" },
      methodNames: { getItem: "readItem" },
      operations: ["getItem"]
    },
    spec: { path: "products/rpc-minimal/spec.pontx.json", sha256: "b".repeat(64) }
  }
});

describe("Pontx hierarchy consumer", () => {
  it("loads and indexes RPC without OAS or HTTP coordinates", () => {
    const parsedApi = catalogApiSchema.parse(api);
    expect(parsedApi).toBeTruthy();
    const operation = api.operations[0];
    expect(operation).toMatchObject({ style: "RPC", sdkMethod: "readItem", operationId: "getItem" });
    expect(operation).not.toHaveProperty("method");
    expect(operation).not.toHaveProperty("path");
    expect(buildSearchResponse([api], "inventory", "en").items[0]?.id)
      .toBe("endpoint:rpc-minimal/get-item");
    expect(getPlaygroundAvailability(operation, "en")).toMatchObject({
      executionEnabled: false
    });
    expect(parsedApi.auth[0]).toMatchObject({
      id: "fixtureKey",
      type: "apiKey",
      credentialGuide: {
        url: "https://pontx.dev/keys",
        title: { zh: "获取测试密钥", en: "Get a fixture key" },
        steps: [{ zh: "打开密钥页面。", en: "Open the key dashboard." }]
      }
    });
    expect(pontxApiView(localizedSpec, operation)).toMatchObject({
      operationId: "getItem",
      responses: { success: { description: "Item result" } }
    });
  });

  it("keeps named SSE event contracts in the public catalog", () => {
    const streamSpec = loadPontxSpec({
      pontx: "2.1",
      style: "RESTFul",
      name: "streaming-fixture",
      info: { title: "流式 Fixture", version: "1.0.0" },
      servers: [{ id: "api", url: "https://api.example.test" }],
      apis: {
        "stream/rates": {
          operationId: "streamRates",
          method: "GET",
          path: "/rates/stream",
          summary: "流式汇率",
          description: "返回命名事件。",
          responses: {
            "200": {
              description: "事件流",
              content: { "text/event-stream": { schema: { type: "string" } } }
            }
          },
          requestExamples: {
            default: { request: {}, expectedStatus: "200" }
          },
          sse: {
            unknownEventPolicy: "preserve",
            events: {
              delta: { dataFormat: "json", description: "汇率变更。", schema: { $ref: "#/components/schemas/Rate" } },
              done: { dataFormat: "text", terminal: true }
            }
          }
        }
      },
      components: {
        schemas: {
          Rate: { type: "object", properties: { currency: { type: "string" } } }
        }
      }
    });
    const catalog = buildCatalogApi({
      metadataCommit: "c".repeat(40),
      product: {
        slug: "streaming-fixture",
        name: "Streaming fixture",
        provider: "Pontx",
        category: "Fixture",
        featured: false,
        display: { title: "流式 Fixture API", summary: "验证 SSE 索引。", accent: "#334155" },
        legal: { license: "MIT", attributionUrl: "https://pontx.dev/" },
        credentials: [],
        quickStart: { operationId: "streamRates", requestExampleId: "default" }
      },
      localizedProduct: { display: { title: "Streaming fixture API", summary: "Verifies SSE indexing." } },
      spec: streamSpec,
      localizedSpec: streamSpec,
      sdk: {
        package: { name: "@pontx/streaming-fixture", version: "0.0.0", status: "planned" },
        spec: { path: "products/streaming-fixture/spec.pontx.json", sha256: "d".repeat(64) }
      }
    });

    const parsed = catalogApiSchema.parse(catalog);
    expect(parsed.operations[0].sse).toEqual({
      unknownEventPolicy: "preserve",
      events: [
        expect.objectContaining({ name: "delta", dataFormat: "json", schemaName: "Rate", properties: ["currency"] }),
        expect.objectContaining({ name: "done", dataFormat: "text", terminal: true })
      ]
    });
  });
});
