import { describe, expect, it } from "vitest";
import { hubApi } from "./hub-api.server";
import { listSkillSummaries } from "~/lib/product-skills.server";

describe("Hub API", () => {
  it("returns a versioned catalog with an ETag", async () => {
    const response = await hubApi.request("/api/v1/catalog");
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBeTruthy();
    expect(payload.version).toBe("v1");
    const slugs = payload.data.map((api: { slug: string }) => api.slug);
    expect([
      ["dida365", "frankfurter", "frankfurter-v2", "massive"],
      ["dida365", "dropbox-sign", "frankfurter", "frankfurter-v2", "massive"],
      ["dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive"],
      ["dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive", "stripe-identity"],
      ["dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive", "stripe-identity", "twelve-data-forex"],
      ["currencybeacon-rest", "dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive", "stripe-identity", "twelve-data-forex"],
      ["amazon-sqs", "currencybeacon-rest", "dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive", "stripe-identity", "twelve-data-forex"],
      ["amazon-sqs", "currencybeacon-rest", "dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive", "pinhere", "stripe-identity", "twelve-data-forex"],
      ["amazon-sqs", "currencybeacon-rest", "dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive", "nager-date", "pinhere", "stripe-identity", "twelve-data-forex"]
    ]).toContainEqual(slugs);
  });

  it("serves layered v2 product metadata without embedding resource details in summaries", async () => {
    const listResponse = await hubApi.request("/api/v2/products");
    const list = await listResponse.json();
    expect(listResponse.status).toBe(200);
    expect(list.version).toBe("v2");
    expect(list.metadataRevision).toMatch(/^[a-f0-9]{40}$/);
    expect(list.data[0]).toMatchObject({
      id: expect.stringMatching(/^api:/),
      endpointCount: expect.any(Number),
      schemaCount: expect.any(Number),
      sdk: expect.objectContaining({ packageName: expect.any(String) })
    });
    expect(list.data[0]).not.toHaveProperty("endpoints");
    expect(list.data[0]).not.toHaveProperty("schemas");

    const denseProduct = [...list.data].sort(
      (left, right) => right.schemaCount - left.schemaCount
    )[0];
    const summaryResponse = await hubApi.request(
      `/api/v2/products/${denseProduct.slug}`
    );
    const summary = await summaryResponse.json();
    expect(summaryResponse.status).toBe(200);
    expect(summary.data.endpoints).toHaveLength(denseProduct.endpointCount);
    expect(summary.data.schemas).toHaveLength(denseProduct.schemaCount);
    expect(summary.data.endpoints[0]).not.toHaveProperty("parameters");
    expect(summary.data.endpoints[0]).not.toHaveProperty("responses");
    expect(summary.data.schemas[0]).not.toHaveProperty("schema");
    expect(summary.data.schemas[0]).not.toHaveProperty("properties");
  });

  it("serves localized Endpoint and Schema details plus an explicit full-metadata resource", async () => {
    const summaryResponse = await hubApi.request(
      "/api/v2/products/twelve-data-forex"
    );
    const summary = await summaryResponse.json();
    const endpoint = summary.data.endpoints[0];
    const schema = summary.data.schemas[0];

    const endpointResponse = await hubApi.request(
      `/api/v2/products/twelve-data-forex/endpoints/${endpoint.slug}?locale=zh`
    );
    const endpointDetail = await endpointResponse.json();
    expect(endpointResponse.status).toBe(200);
    expect(endpointDetail.data.locale).toBe("zh");
    expect(endpointDetail.data.endpoint.slug).toBe(endpoint.slug);
    expect(Object.keys(endpointDetail.data.pontxSpec.apis)).toHaveLength(
      summary.data.endpointCount
    );
    expect(endpointDetail.data.endpoint).toHaveProperty("parameters");
    expect(endpointDetail.data.endpoint).toHaveProperty("responses");

    const schemaResponse = await hubApi.request(
      `/api/v2/products/twelve-data-forex/schemas/${encodeURIComponent(schema.name)}?locale=en`
    );
    const schemaDetail = await schemaResponse.json();
    expect(schemaResponse.status).toBe(200);
    expect(schemaDetail.data.locale).toBe("en");
    expect(schemaDetail.data.schema.name).toBe(schema.name);
    expect(schemaDetail.data.pontxSpec.components.schemas).toHaveProperty(
      schema.name
    );

    const fullResponse = await hubApi.request(
      "/api/v2/products/twelve-data-forex/metadata?locale=en"
    );
    const full = await fullResponse.json();
    expect(fullResponse.status).toBe(200);
    expect(full.data.product.operations).toHaveLength(summary.data.endpointCount);
    expect(Object.keys(full.data.pontxSpec.components.schemas)).toHaveLength(
      summary.data.schemaCount
    );
    expect(JSON.stringify(endpointDetail).length).toBeLessThan(
      JSON.stringify(full).length / 3
    );
    expect(JSON.stringify(schemaDetail).length).toBeLessThan(
      JSON.stringify(full).length / 3
    );
  });

  it("validates metadata locales and reuses ETags", async () => {
    const invalid = await hubApi.request(
      "/api/v2/products/frankfurter/metadata?locale=fr"
    );
    expect(invalid.status).toBe(422);
    expect((await invalid.json()).error.code).toBe("invalid_locale");

    const first = await hubApi.request("/api/v2/products/frankfurter");
    const second = await hubApi.request("/api/v2/products/frankfurter", {
      headers: { "If-None-Match": first.headers.get("etag")! }
    });
    expect(second.status).toBe(304);
  });

  it("returns a machine-readable 404", async () => {
    const response = await hubApi.request("/api/v1/specs/missing");
    const payload = await response.json();
    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("not_found");
    expect(payload.error.requestId).toBeTruthy();
  });

  it("serves reviewed pricing through a stable CLI-facing contract", async () => {
    const response = await hubApi.request("/api/v1/specs/frankfurter/pricing");
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.version).toBe("v1");
    expect(["free", "unknown"]).toContain(payload.data.status);
    expect(payload.data.summary).toMatchObject({ zh: expect.any(String), en: expect.any(String) });
  });

  it("globally searches APIs, endpoints, and schemas through v2", async () => {
    const response = await hubApi.request(
      "/api/v2/search?q=%E4%BB%BB%E5%8A%A1&locale=zh&limit=50"
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.version).toBe("v2");
    expect(payload.data.counts.api).toBeGreaterThan(0);
    expect(payload.data.counts.endpoint).toBeGreaterThan(0);
    expect(payload.data.counts.schema).toBeGreaterThan(0);
    expect(payload.data.items.some((item: { id: string }) => item.id === "schema:dida365/Task")).toBe(true);
  });

  it("exposes hybrid semantic matches from request and response metadata", async () => {
    const response = await hubApi.request(
      "/api/v2/search?q=%E6%96%B0%E5%A2%9E%E5%BE%85%E5%8A%9E&locale=zh&types=endpoint"
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.data.strategy).toBe("hybrid-semantic");
    expect(payload.data.semanticVersion).toBe("pontx-multilingual-v1");
    expect(payload.data.items[0].id).toBe("endpoint:dida365/create-task");
    expect(payload.data.items[0].match.mode).toBe("semantic");
  });

  it("filters global search resource types and validates query options", async () => {
    const filtered = await hubApi.request(
      "/api/v2/search?q=projectId&types=schema&locale=en"
    );
    const filteredPayload = await filtered.json();
    expect(filtered.status).toBe(200);
    expect(filteredPayload.data.items.every((item: { kind: string }) => item.kind === "schema")).toBe(true);

    const invalid = await hubApi.request(
      "/api/v2/search?q=task&types=unknown"
    );
    expect(invalid.status).toBe(422);
    expect((await invalid.json()).error.code).toBe("invalid_types");
  });

  it("links API search results to the API overview", async () => {
    const response = await hubApi.request(
      "/api/v2/search?q=Frankfurter&types=api&locale=en"
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.data.items[0].href).toBe("/en/apis/frankfurter");
  });

  it("returns a versioned schema detail", async () => {
    const response = await hubApi.request(
      "/api/v2/specs/dida365/schemas/TaskCreate"
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.version).toBe("v2");
    expect(payload.data.schema.name).toBe("TaskCreate");
  });

  it("serves the validated universal Agent Skill bundle", async () => {
    const response = await hubApi.request("/api/v1/skill");
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.data.name).toBe("pontx-hub");
    expect(payload.data.files["SKILL.md"]).toContain("pontx-hub <api-collection> preview");
    expect(payload.data.files["SKILL.md"]).toContain("--type schema");
    expect(payload.data.files["references/auth-and-safety.md"]).toBeTruthy();
  });

  it("lists the universal Skill first without embedding file contents", async () => {
    const response = await hubApi.request("/api/v1/skills");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBeTruthy();
    expect(payload.version).toBe("v1");
    expect(payload.data).toHaveLength(listSkillSummaries().length);
    expect(payload.data[0]).toMatchObject({
      name: "pontx-hub",
      version: expect.any(String),
      description: expect.any(String),
      license: "MIT-0",
      contentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      files: expect.arrayContaining([
        { path: "SKILL.md", sha256: expect.stringMatching(/^[a-f0-9]{64}$/) },
        { path: "LICENSE", sha256: expect.stringMatching(/^[a-f0-9]{64}$/) }
      ])
    });
    expect(payload.data[0]).not.toHaveProperty("apiSlug");
    expect(payload.data[0].files[0]).not.toHaveProperty("content");
    expect(
      payload.data.some((skill: { apiSlug?: string }) => Boolean(skill.apiSlug))
    ).toBe(true);
  });

  it("serves native verified Skill details while retaining the legacy bundle", async () => {
    const detailResponse = await hubApi.request("/api/v1/skills/pontx-hub");
    const detail = await detailResponse.json();
    expect(detailResponse.status).toBe(200);
    expect(detail.data.files).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: "SKILL.md",
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        content: expect.stringContaining("name: pontx-hub")
      })
    ]));

    const legacyResponse = await hubApi.request("/api/v1/skill");
    const legacy = await legacyResponse.json();
    expect(legacyResponse.status).toBe(200);
    expect(legacy.data.files).not.toBeInstanceOf(Array);
    expect(legacy.data.files["SKILL.md"]).toContain("name: pontx-hub");

    const missingResponse = await hubApi.request("/api/v1/skills/pontx-missing");
    expect(missingResponse.status).toBe(404);
    expect((await missingResponse.json()).error.code).toBe("not_found");
  });

  it("previews a request without exposing its bearer token", async () => {
    const response = await hubApi.request("/api/v1/playground/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiSlug: "dida365",
        operationSlug: "get-task-by-project-id-and-task-id",
        serverId: "default",
        path: { projectId: "project-1", taskId: "task-1" },
        auth: {
          type: "oauth2",
          schemeId: "OAuth2",
          token: "secret-token"
        }
      })
    });
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).not.toContain("secret-token");
    expect(text).toContain("Bearer ••••••••");
  });

  it("prepares an executable Massive request without fetching during preview", async () => {
    const response = await hubApi.request("/api/v1/playground/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiSlug: "massive",
        operationSlug: "get-previous-close",
        serverId: "massive",
        path: { stocksTicker: "AAPL" },
        query: { adjusted: true }
      })
    });
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.data.url).toBe("https://api.massive.com/v2/aggs/ticker/AAPL/prev?adjusted=true");
    expect(payload.data.proxyEnabled).toBe(true);
  });

  it("keeps Twelve Data exchange-rate requests executable after preview", async () => {
    const response = await hubApi.request("/api/v1/playground/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiSlug: "twelve-data-forex",
        operationSlug: "get-exchange-rate",
        serverId: "twelve-data-api",
        path: {},
        query: { symbol: "EUR/USD" }
      })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.url).toBe("https://api.twelvedata.com/exchange_rate?symbol=EUR%2FUSD");
    expect(payload.data.proxyEnabled).toBe(true);
    expect(payload.data.warnings).toEqual([]);
  });

  it("reports a missing RPC execution adapter without a generic 500", async () => {
    const response = await hubApi.request("/api/v1/playground/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiSlug: "amazon-sqs",
        operationSlug: "list-queues",
        serverId: "aws-sqs-regional",
        path: {},
        query: {}
      })
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("request_rejected");
    expect(payload.error.message).toBe(
      "This PontxSpec style has no Hub execution adapter"
    );
  });

  it("generates code against the published SDK client contract", async () => {
    const response = await hubApi.request("/api/v1/codegen/snippet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiSlug: "frankfurter",
        operationSlug: "get-historical-rates",
        serverId: "default",
        path: { date: "2024-01-15" },
        query: { amount: "1", base: "EUR", symbols: "" }
      })
    });
    const payload = await response.json();
    if (response.status === 409) {
      expect(payload.error.code).toBe("sdk_operation_unavailable");
      return;
    }
    expect(response.status).toBe(200);
    expect(payload.data.code).toContain(
      'import { currencyExchangeClient } from "@pontx/frankfurter";'
    );
    expect(payload.data.code).toContain(
      "currencyExchangeClient.exchangeRates.getHistoricalRates"
    );
    expect(payload.data.code).toContain('"2024-01-15"');
    expect(payload.data.code).toContain('"base": "EUR"');
    expect(payload.data.code).not.toContain("createClient");
    expect(payload.data.code).not.toContain('"symbols"');
  });
});
