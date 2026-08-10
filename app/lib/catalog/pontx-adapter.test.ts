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
});
