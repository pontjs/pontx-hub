import { getSchemaInputValue } from "@pontx/shadcn-ui";
import { describe, expect, it } from "vitest";
import { getCatalogApi } from "./catalog.server";
import {
  inferPontxSchema,
  pontxOperationName,
  toPontxApi,
  toPontxSpec
} from "./pontx-adapter";

const frankfurterV2 = getCatalogApi("frankfurter-v2");
const itWithFrankfurterV2 = frankfurterV2 ? it : it.skip;

describe("pontx-shadcn-ui catalog adapter", () => {
  it("infers nested response schemas from approved examples", () => {
    expect(
      inferPontxSchema({
        rates: { USD: 1.04 },
        currencies: ["USD"]
      })
    ).toMatchObject({
      type: "object",
      properties: {
        rates: {
          type: "object",
          properties: { USD: { type: "number" } }
        },
        currencies: {
          type: "array",
          items: { type: "string" }
        }
      }
    });
  });

  it("creates namespaced APIs for ApiDirectory grouping", () => {
    const api = getCatalogApi("frankfurter");
    expect(api).toBeDefined();
    const spec = toPontxSpec(api!, "zh");
    expect(Object.keys(spec.apis)).toContain(
      "Exchange Rates/getLatestRates"
    );
    expect(spec.tags?.map((tag) => tag.name)).toContain("Exchange Rates");
  });

  it("maps request bodies and auth for the real Playground component", () => {
    const api = getCatalogApi("dida365");
    const operation = api?.operations.find(
      (item) => item.slug === "create-task"
    );
    expect(api).toBeDefined();
    expect(operation).toBeDefined();
    const pontxApi = toPontxApi(api!, operation!, "en");
    expect(pontxOperationName(operation!)).toBe("task/createTask");
    expect(pontxApi.requestBody?.content["application/json"].schema).toMatchObject({
      type: "object",
      properties: {
        isAllDay: { type: "boolean" }
      }
    });
    expect(pontxApi.securitySchemes).toMatchObject({
      OAuth2: {
        type: "oauth2",
        flows: {
          authorizationCode: {
            authorizationUrl: "https://dida365.com/oauth/authorize",
            tokenUrl: "https://dida365.com/oauth/token"
          }
        }
      }
    });
    expect(operation?.security).toContainEqual({ schemeId: "OAuth2", scopes: ["tasks:write"] });
  });

  it("passes localized parameter descriptions to Playground fields", () => {
    const api = getCatalogApi("dida365");
    const operation = api?.operations.find(
      (item) => item.slug === "get-task-by-project-id-and-task-id"
    );
    expect(api).toBeDefined();
    expect(operation).toBeDefined();

    const pontxApi = toPontxApi(api!, operation!, "en");
    expect(
      pontxApi.parameters?.find((parameter) => parameter.name === "projectId")
    ).toMatchObject({
      description: "Project identifier",
      schema: { description: "Project identifier" }
    });
  });

  it("passes localized response schemas to the Playground by status code", () => {
    const api = getCatalogApi("frankfurter");
    const operation = api?.operations.find(
      (item) => item.slug === "get-latest-rates"
    );
    expect(api).toBeDefined();
    expect(operation).toBeDefined();

    const englishApi = toPontxApi(api!, operation!, "en");
    expect(englishApi.responses["200"]).toMatchObject({
      description: "Successful response with exchange rates",
      schema: { $ref: "#/components/schemas/ExchangeRateResponse" }
    });
    expect(englishApi.responses["404"]?.schema).toEqual({
      $ref: "#/components/schemas/Error"
    });
    expect(
      englishApi.components.schemas.ExchangeRateResponse.properties?.amount
    ).toMatchObject({ description: "The amount used for conversion" });

    const chineseApi = toPontxApi(api!, operation!, "zh");
    expect(
      chineseApi.components.schemas.ExchangeRateResponse.properties?.amount
    ).toMatchObject({ description: "用于换算的金额" });
  });

  it("preserves array response shapes around referenced item schemas", () => {
    const api = getCatalogApi("frankfurter-v2");
    const operation = api?.operations.find((item) => item.slug === "get-rates");
    expect(api).toBeDefined();
    expect(operation).toBeDefined();

    const adaptedApi = toPontxApi(api!, operation!, "en");
    expect(adaptedApi.responses["200"]?.schema).toEqual({
      type: "array",
      items: { $ref: "#/components/schemas/Rate" }
    });
    expect(adaptedApi.components.schemas.Rate.properties?.rate).toMatchObject({
      description: "Exchange rate value"
    });
  });

  itWithFrankfurterV2("keeps parameter defaults, examples, enums, and constraints distinct", () => {
    const api = frankfurterV2;
    const operation = api?.operations.find((item) => item.slug === "get-rates");
    expect(api).toBeDefined();
    expect(operation).toBeDefined();
    const pontxApi = toPontxApi(api!, operation!, "en");
    const parameters = pontxApi.parameters ?? [];
    const base = parameters.find((parameter) => parameter.name === "base");
    const group = parameters.find((parameter) => parameter.name === "group");
    expect(base?.schema).toMatchObject({ default: "EUR", examples: ["USD"] });
    expect(group?.schema).toMatchObject({ enum: ["week", "month"], examples: ["month"] });
  });

  itWithFrankfurterV2("prefills defaults and required examples without optional examples", () => {
    const api = frankfurterV2;
    const operation = api?.operations.find((item) => item.slug === "get-rates");
    expect(api).toBeDefined();
    expect(operation).toBeDefined();

    const pontxApi = toPontxApi(api!, operation!, "en", {
      parameterExamples: "required"
    });
    const initialQuery = Object.fromEntries(
      (pontxApi.parameters ?? [])
        .filter((parameter) => parameter.in === "query")
        .map(
          (parameter) =>
            [
              parameter.name,
              getSchemaInputValue(parameter.schema)
            ] as const
        )
        .filter((entry) => entry[1] !== "")
    );

    expect(initialQuery).toEqual({ base: "EUR" });
    expect(
      pontxApi.parameters?.find((parameter) => parameter.name === "date")
        ?.schema.examples
    ).toBeUndefined();
    expect(
      pontxApi.parameters?.find((parameter) => parameter.name === "group")
        ?.schema
    ).toMatchObject({ enum: ["week", "month"] });

    const requiredOperation = api?.operations.find(
      (item) => item.slug === "get-rate"
    );
    expect(requiredOperation).toBeDefined();
    const requiredApi = toPontxApi(api!, requiredOperation!, "en", {
      parameterExamples: "required"
    });
    expect(
      Object.fromEntries(
        (requiredApi.parameters ?? [])
          .filter((parameter) => parameter.in === "path")
          .map(
            (parameter) =>
              [
                parameter.name,
                getSchemaInputValue(parameter.schema)
              ] as const
          )
      )
    ).toEqual({ base: "EUR", quote: "USD" });
  });
});
