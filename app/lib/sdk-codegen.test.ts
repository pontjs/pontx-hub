import { describe, expect, it } from "vitest";
import type { CatalogApi, CatalogOperation } from "~/lib/catalog/types";
import {
  generateSdkSnippet,
  SdkCodegenUnavailableError,
  supportsSdkOperation
} from "./sdk-codegen";

const operation = {
  operationId: "getRate",
  tag: "default",
  parameters: [
    { name: "base", in: "path" },
    { name: "quote", in: "path" },
    { name: "date", in: "query" }
  ]
} as CatalogOperation;

function api(
  client: NonNullable<CatalogApi["sdkContract"]>["client"],
  auth?: NonNullable<CatalogApi["sdkContract"]>["auth"]
): CatalogApi {
  return {
    slug: "rates",
    packageName: "@pontx/rates",
    sdkVersion: "1.2.3",
    sdkContract: {
      client,
      ...(auth ? { auth } : {}),
      controllers: { default: "common" },
      operations: ["getRate"]
    }
  } as unknown as CatalogApi;
}

describe("generateSdkSnippet", () => {
  it("generates the published default-client hierarchy and argument order", () => {
    expect(generateSdkSnippet(api({
      kind: "default",
      identifier: "ratesClient"
    }), operation, {
      path: { base: "EUR", quote: "USD" },
      query: { date: "2026-08-14" },
      headers: {}
    })).toBe(`import ratesClient from "@pontx/rates";

const result = await ratesClient.common.getRate(
  "EUR",
  "USD",
  {
    "date": "2026-08-14"
  }
);`);
  });

  it("generates a root-level method when the SDK has no controller", () => {
    const flatApi = api({
      kind: "named",
      identifier: "frankfurterV2Client"
    });
    flatApi.sdkContract = {
      ...flatApi.sdkContract!,
      controllers: { default: null }
    };

    const code = generateSdkSnippet(flatApi, operation, {
      path: { base: "EUR", quote: "USD" },
      query: {},
      headers: {}
    });

    expect(supportsSdkOperation(flatApi, operation)).toBe(true);
    expect(code).toContain("frankfurterV2Client.getRate(");
    expect(code).not.toContain("frankfurterV2Client.common");
  });

  it("generates named client imports for CommonJS-compatible packages", () => {
    const code = generateSdkSnippet(api({
      kind: "named",
      identifier: "ratesClient"
    }), operation, {
      path: { base: "EUR", quote: "USD" },
      query: {},
      headers: {}
    });

    expect(code).toContain('import { ratesClient } from "@pontx/rates";');
  });

  it("generates factory setup from environment variables", () => {
    const code = generateSdkSnippet(api({
      kind: "factory",
      factory: "createRatesClient",
      identifier: "client",
      options: { apiKey: "RATES_API_KEY" }
    }), operation, {
      path: { base: "EUR", quote: "USD" },
      query: {},
      headers: {}
    });

    expect(code).toContain('import { createRatesClient } from "@pontx/rates";');
    expect(code).toContain("apiKey: process.env.RATES_API_KEY!");
    expect(code).toContain("client.common.getRate");
  });

  it("places request bodies before named parameters and bearer request init", () => {
    const bodyOperation = {
      operationId: "updateTask",
      tag: "task",
      parameters: [
        { name: "taskId", in: "path" },
        { name: "body", in: "body" }
      ],
      requestBody: {}
    } as CatalogOperation;
    const dida = api({ kind: "default", identifier: "Dida365Client" }, {
      kind: "bearer-request-init",
      envVar: "DIDA365_ACCESS_TOKEN"
    });
    dida.schemas = [{
      name: "TaskUpdate",
      required: ["id", "projectId"],
      properties: [
        { name: "id", type: "string" },
        { name: "projectId", type: "string" }
      ]
    }] as CatalogApi["schemas"];
    bodyOperation.requestBody = { schemaName: "TaskUpdate" };
    dida.sdkContract = {
      ...dida.sdkContract!,
      controllers: { task: "task" },
      operations: ["updateTask"]
    };

    const code = generateSdkSnippet(dida, bodyOperation, {
      path: { taskId: "task-1" },
      query: {},
      headers: {},
      body: { title: "Updated" }
    });
    expect(code.indexOf('"title"')).toBeLessThan(code.indexOf("const result"));
    expect(code.indexOf('"task-1"')).toBeLessThan(code.indexOf("sdkRequestBody,"));
    expect(code.indexOf("sdkRequestBody,")).toBeLessThan(code.indexOf("Authorization"));
    expect(code).toContain('"id": "REPLACE_WITH_ID"');
    expect(code).toContain('"projectId": "REPLACE_WITH_PROJECT_ID"');
    expect(code).toContain("process.env.DIDA365_ACCESS_TOKEN!");
  });

  it("uses visible type-safe placeholders for missing required inputs", () => {
    const missingInputs = {
      ...operation,
      parameters: [
        { name: "base", in: "path", type: "string" },
        { name: "limit", in: "query", type: "integer", required: true }
      ]
    } as CatalogOperation;
    const code = generateSdkSnippet(
      api({ kind: "default", identifier: "ratesClient" }),
      missingInputs,
      { path: {}, query: {}, headers: {} }
    );

    expect(code).toContain('"REPLACE_WITH_BASE"');
    expect(code).toContain('"limit": 0');
  });

  it("rejects operations absent from the published SDK contract", () => {
    const contractApi = api({ kind: "default", identifier: "ratesClient" });
    const unsupported = { ...operation, operationId: "missing" };
    expect(supportsSdkOperation(contractApi, unsupported)).toBe(false);
    expect(() => generateSdkSnippet(contractApi, unsupported, {
      path: {}, query: {}, headers: {}
    })).toThrow(SdkCodegenUnavailableError);
  });
});
