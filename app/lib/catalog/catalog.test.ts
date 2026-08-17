import { describe, expect, it } from "vitest";
import {
  getCatalogOperation,
  getCatalogSchema,
  listCatalog,
  listCatalogSummaries,
  searchCatalog
} from "./catalog.server";
import { catalogApiSchema } from "./schema";

describe("curated catalog", () => {
  it("loads and validates every synchronized metadata API", () => {
    const catalog = listCatalog();
    expect([
      ["dida365", "frankfurter", "frankfurter-v2", "massive"],
      ["dida365", "dropbox-sign", "frankfurter", "frankfurter-v2", "massive"],
      ["dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive"],
      ["dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive", "stripe-identity"],
      ["dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive", "stripe-identity", "twelve-data-forex"],
      ["currencybeacon-rest", "dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive", "stripe-identity", "twelve-data-forex"],
      ["amazon-sqs", "currencybeacon-rest", "dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive", "stripe-identity", "twelve-data-forex"],
      ["amazon-sqs", "currencybeacon-rest", "dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive", "pinhere", "stripe-identity", "twelve-data-forex"],
      ["amazon-sqs", "currencybeacon-rest", "dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive", "nager-date", "pinhere", "stripe-identity", "twelve-data-forex"],
      ["amazon-sqs", "currencybeacon-rest", "dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive", "mongodb-atlas-admin", "nager-date", "openai", "pinhere", "stripe-identity", "twelve-data-forex"],
      ["amazon-sqs", "currencybeacon-rest", "dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive", "mistral-ai", "mongodb-atlas-admin", "nager-date", "openai", "pinhere", "stripe-identity", "twelve-data-forex", "notion", "sendbird-chat-platform"],
      ["amazon-sqs", "currencybeacon-rest", "dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive", "mistral-ai", "mongodb-atlas-admin", "nager-date", "openai", "pinhere", "stripe-identity", "twelve-data-forex", "notion", "sendbird-chat-platform", "wps-365"],
      ["amazon-sqs", "currencybeacon-rest", "dida365", "dropbox-sign", "ecb-data-portal", "frankfurter", "frankfurter-v2", "massive", "mistral-ai", "mongodb-atlas-admin", "nager-date", "openai", "pinhere", "stripe-identity", "twelve-data-forex", "notion", "open-exchange-rates", "posthog", "sendbird-chat-platform", "wps-365"]
    ]).toContainEqual(catalog.map((api) => api.slug));
    expect(new Set(catalog.map((api) => api.slug)).size).toBe(catalog.length);
  });

  it("accepts canonical scoped SDK package names", () => {
    const api = listCatalog().find((candidate) => candidate.slug === "dida365");
    expect(catalogApiSchema.parse({
      ...api,
      packageName: "@pontx/dida365"
    }).packageName).toBe("@pontx/dida365");
    expect(catalogApiSchema.safeParse({
      ...api,
      packageName: "@other/dida365"
    }).success).toBe(false);
  });

  it("accepts version-bound SDK quality evidence and rejects mismatched claims", () => {
    const api = listCatalog().find((candidate) => candidate.slug === "dida365");
    const sdkQuality = {
      testedVersion: api?.sdkVersion,
      unitTests: { passed: 4, total: 4, skipped: 0 },
      e2eStatus: "passed" as const,
      nodeVersions: ["18", "20", "22"],
      sourceCommit: "a".repeat(40),
      testedAt: "2026-08-14",
      repositoryUrl: "https://github.com/pontjs/dida365",
      workflowRunUrl: "https://github.com/pontjs/dida365/actions/runs/1"
    };
    expect(catalogApiSchema.safeParse({ ...api, sdkQuality }).success).toBe(true);
    expect(catalogApiSchema.safeParse({
      ...api,
      sdkQuality: { ...sdkQuality, testedVersion: "9.9.9" }
    }).success).toBe(false);
    expect(catalogApiSchema.safeParse({
      ...api,
      sdkQuality: {
        ...sdkQuality,
        workflowRunUrl: "https://github.com/pontjs/other/actions/runs/1"
      }
    }).success).toBe(false);
  });

  it("keeps untagged SDK methods flat and isolates compatibility aliases", () => {
    const api = listCatalog().find(
      (candidate) => candidate.slug === "frankfurter-v2"
    );
    const syntheticContract = {
      ...api?.sdkContract,
      controllers: { ...api?.sdkContract?.controllers, default: null }
    };

    expect(catalogApiSchema.safeParse({
      ...api,
      sdkContract: syntheticContract
    }).success).toBe(false);
    expect(catalogApiSchema.safeParse({
      ...api,
      sdkContract: {
        ...api?.sdkContract,
        controllers: {},
        compatibilityAliases: { common: ["getRates"] }
      }
    }).success).toBe(true);
  });

  it("provides every endpoint with a successful request example and a ready Quick Start", () => {
    const catalog = listCatalog();
    const operations = catalog.flatMap((api) => api.operations);
    expect([53, 126, 134, 142, 253, 258, 281, 315, 321, 1149, 1519, 2355]).toContain(operations.length);
    expect(operations.every((operation) => operation.requestExamples.length > 0)).toBe(true);
    expect(
      operations.flatMap((operation) => operation.requestExamples).every(
        (example) =>
          (example.completeness === "ready") === (example.unresolved.length === 0)
      )
    ).toBe(true);
    for (const api of catalog) {
      const operation = api.operations.find(
        (candidate) => candidate.slug === api.quickStart?.operationSlug
      );
      const example = operation?.requestExamples.find(
        (candidate) => candidate.id === api.quickStart?.requestExampleId
      );
      expect(example?.completeness, api.slug).toBe("ready");
    }
  });

  it("preserves array-valued request properties when their items use PontxSpec refs", () => {
    const api = listCatalog().find((candidate) => candidate.slug === "dropbox-sign");
    const operation = api?.operations.find(
      (candidate) => candidate.operationId === "signatureRequestCreateEmbeddedWithTemplate"
    );
    const schema = api?.schemas.find(
      (candidate) => candidate.name === operation?.requestBody?.schemaName
    );
    expect(schema?.properties.find((property) => property.name === "signers")?.type).toBe("array");
  });

  it("preserves ECB's published SDK contract without a product-wide execution gate", () => {
    const api = listCatalog().find((candidate) => candidate.slug === "ecb-data-portal");
    if (!api) return;
    expect(api?.packageName).toBe("@pontx/ecb-data-portal");
    expect(api?.sdkVersion).toBe("0.1.1");
    expect(api?.proxyEnabled).toBe(true);
    expect(api?.operations).toHaveLength(8);
    expect(api?.schemas).toHaveLength(12);
    expect(api?.quickStart).toEqual({
      operationSlug: "get-data-by-series-key",
      requestExampleId: "default"
    });
  });

  it("preserves Nager.Date's full caller-direct Community API v4 SDK contract", () => {
    const api = listCatalog().find((candidate) => candidate.slug === "nager-date");
    if (!api) return;
    expect(api?.packageName).toBe("@pontx/nager-date");
    expect(api?.sdkVersion).toBe("0.1.0");
    expect(api?.proxyEnabled).toBe(false);
    expect(api?.operations).toHaveLength(6);
    expect(api?.schemas).toHaveLength(8);
    expect(api?.sdkContract?.controllers).toEqual({
      countries: "countries",
      holidays: "holidays",
      iotHolidays: "iotHolidays",
      versions: "versions"
    });
    expect(api?.quickStart).toEqual({
      operationSlug: "list-holidays-by-year",
      requestExampleId: "default"
    });
  });

  it("preserves CurrencyBeacon's full, flat SDK contract without a product-wide execution gate", () => {
    const api = listCatalog().find((candidate) => candidate.slug === "currencybeacon-rest");
    expect(api?.packageName).toBe("@pontx/currencybeacon-rest");
    expect(api?.sdkVersion).toBe("0.1.2");
    expect(api?.proxyEnabled).toBe(true);
    expect(api?.sdkContract?.controllers).toEqual({});
    expect(api?.operations).toHaveLength(5);
    expect(api?.schemas).toHaveLength(11);
    expect(api?.quickStart).toEqual({
      operationSlug: "get-latest-rates",
      requestExampleId: "default"
    });
  });

  it("keeps REST Endpoints executable unless metadata records a proxy-risk decision", () => {
    const restOperations = listCatalog()
      .flatMap((api) => api.operations)
      .filter((operation) => operation.style === "RESTFul");

    expect([258, 264, 292, 298, 1126, 1496, 2332]).toContain(restOperations.length);
    expect(restOperations.every((operation) =>
      operation.proxyEnabled || Boolean(operation.proxyDisabledReason)
    )).toBe(true);
  });

  it("preserves Amazon SQS's complete RPC contract with Hub execution disabled", () => {
    const api = listCatalog().find((candidate) => candidate.slug === "amazon-sqs");
    if (!api) {
      expect(listCatalog()).toHaveLength(9);
      return;
    }
    expect(api?.packageName).toBe("@pontx/amazon-sqs");
    expect(api?.sdkVersion).toBe("0.1.4");
    expect(api?.proxyEnabled).toBe(false);
    expect(api?.sdkContract?.controllers).toEqual({});
    expect(api?.sdkContract?.client).toMatchObject({
      kind: "factory",
      factory: "createAmazonSqsClient",
      identifier: "client",
      options: {}
    });
    expect(api?.operations.find((operation) => operation.operationId === "ListQueues")
      ?.sdkMethod).toBe("listQueues");
    expect(api?.operations).toHaveLength(23);
    expect(api?.schemas).toHaveLength(114);
    expect(api?.quickStart).toEqual({
      operationSlug: "list-queues",
      requestExampleId: "default"
    });
    expect(api?.operations.every((operation) =>
      operation.style === "RPC" && operation.proxyEnabled === false && !operation.method && !operation.path
    )).toBe(true);
  });

  it("publishes MongoDB Atlas as a complete caller-direct SDK contract", () => {
    const api = listCatalog().find((candidate) => candidate.slug === "mongodb-atlas-admin");
    const serviceAccount = api?.auth.find((candidate) => candidate.id === "ServiceAccounts");
    expect(api).toMatchObject({
      packageName: "@pontx/mongodb-atlas-admin",
      sdkVersion: "0.1.0",
      sdkStatus: "published",
      cliName: "pontx-mongodb-atlas-admin",
      proxyEnabled: false
    });
    expect(api?.operations).toHaveLength(540);
    expect(api?.schemas).toHaveLength(1145);
    expect(Object.keys(api?.sdkContract?.controllers ?? {})).toHaveLength(58);
    expect(serviceAccount).toMatchObject({
      type: "oauth2",
      envVar: "MONGODB_ATLAS_SERVICE_ACCOUNT_CLIENT_ID",
      secretEnvVar: "MONGODB_ATLAS_SERVICE_ACCOUNT_CLIENT_SECRET"
    });
  });

  it("preserves Open Exchange Rates as a published caller-direct SDK contract", () => {
    const api = listCatalog().find((candidate) => candidate.slug === "open-exchange-rates");
    expect(api).toMatchObject({
      packageName: "@pontx/open-exchange-rates",
      sdkVersion: "0.1.0",
      sdkStatus: "published",
      cliName: "pontx-open-exchange-rates",
      proxyEnabled: false
    });
    expect(api?.operations).toHaveLength(7);
    expect(api?.schemas).toHaveLength(17);
    expect(api?.sdkContract?.controllers).toEqual({});
    expect(api?.sdkContract?.client).toMatchObject({
      kind: "factory",
      factory: "createOpenExchangeRatesClient",
      identifier: "client",
      options: { appId: "PONTX_OPEN_EXCHANGE_RATES_APP_ID" }
    });
    expect(api?.operations.every((operation) => operation.proxyEnabled === false)).toBe(true);
  });

  it("returns summaries without operation payloads", () => {
    const summaries = listCatalogSummaries();
    const summary = summaries[0];
    expect(summary.operationCount).toBeGreaterThan(0);
    expect(summary.defaultOperationSlug).toBeTruthy();
    expect(summary).not.toHaveProperty("operations");
    expect(summary).not.toHaveProperty("servers");
    expect(
      summaries.find((candidate) => candidate.slug === "massive")
        ?.defaultOperationSlug
    ).toBe("get-previous-close");
  });

  it("finds operations by stable slug", () => {
    const result = getCatalogOperation("frankfurter", "get-latest-rates");
    expect(result?.operation.operationId).toBe("getLatestRates");
    expect(result?.operation.method).toBe("GET");
    expect(result?.operation.responses[0].schemaName).toBe("ExchangeRateResponse");
  });

  it("preserves request and response schema relationships", () => {
    const result = getCatalogOperation("dida365", "create-task");
    expect(result?.operation.requestBody?.schemaName).toBe("TaskCreate");
    expect(result?.operation.requestBody?.properties).toContain("projectId");
    expect(result?.operation.responses.find((response) => response.status === "200")?.schemaName).toBe("Task");
  });

  it("finds schemas by stable name", () => {
    const result = getCatalogSchema("dida365", "TaskCreate");
    expect(result?.schema.title.zh).toBe("创建任务请求");
    expect(result?.schema.properties.map((property) => property.name)).toContain("projectId");
    expect(result?.schema.schema).toMatchObject({
      properties: { projectId: { description: "Project id" } }
    });

    const localizedApi = catalogApiSchema.parse({
      ...result?.api,
      schemas: result?.api.schemas.map((schema) =>
        schema.name === "TaskCreate"
          ? {
              ...schema,
              localizedSchema: {
                zh: { properties: { projectId: { description: "项目 ID" } } }
              }
            }
          : schema
      )
    });
    expect(localizedApi.schemas.find((schema) => schema.name === "TaskCreate")?.localizedSchema?.zh).toMatchObject({
      properties: { projectId: { description: "项目 ID" } }
    });
  });

  it("searches APIs, endpoints, schemas, and schema properties", () => {
    const rates = searchCatalog("汇率", "zh");
    expect(rates.items.some((item) => item.kind === "api")).toBe(true);
    expect(rates.items.some((item) => item.kind === "endpoint")).toBe(true);
    expect(rates.items.some((item) => item.kind === "schema")).toBe(true);

    const property = searchCatalog("projectId", "en", { kinds: ["schema"] });
    expect(property.items.every((item) => item.kind === "schema")).toBe(true);
    expect(property.items.some((item) => item.id === "schema:dida365/TaskCreate")).toBe(true);
  }, 30_000);

  it("ranks exact schema names and paginates deterministically", () => {
    const result = searchCatalog("Task", "en", { limit: 2 });
    expect(result.total).toBeGreaterThan(2);
    expect(result.items[0].id).toBe("schema:dida365/Task");
    expect(result.items).toHaveLength(2);
  });

  it("uses bilingual semantics and input/output schema graphs", () => {
    const create = searchCatalog("新增待办", "zh", { kinds: ["endpoint"] });
    expect(create.strategy).toBe("hybrid-semantic");
    expect(create.items[0].id).toBe("endpoint:dida365/create-task");
    expect(create.items[0].match.mode).toBe("semantic");

    const input = searchCatalog("创建任务的入参", "zh", {
      kinds: ["endpoint"]
    });
    expect(input.items[0].id).toBe("endpoint:dida365/create-task");
    expect(input.items[0].match.fields).toContain("request");

    const output = searchCatalog("返回 dueDate 的接口", "zh", {
      kinds: ["endpoint"]
    });
    expect(output.items[0].apiSlug).toBe("dida365");
    expect(output.items[0].match.fields).toContain("response");

    const product = searchCatalog("Productivity", "en", {
      kinds: ["endpoint"]
    });
    expect(product.items.some((item) => item.apiSlug === "dida365")).toBe(true);
    expect(product.items[0].match.fields).toContain("product");

    const currency = searchCatalog("把欧元换算成美元", "zh", {
      kinds: ["endpoint"]
    });
    expect(currency.items.some((item) => item.apiSlug === "frankfurter")).toBe(true);
  }, 30_000);

  it("preserves official market-data provenance without disabling execution", () => {
    const catalog = listCatalog();
    const massive = catalog.find((api) => api.slug === "massive");
    expect(massive).toBeDefined();
    expect(massive?.proxyEnabled).toBe(true);
    expect(massive?.operations.every((operation) => operation.serverIds.length > 0)).toBe(true);
    expect(massive?.documentationStatus).toBe("official");
    expect(massive?.evidenceUrls.length).toBeGreaterThan(0);
  });
});
