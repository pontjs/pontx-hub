import { getSchemaInputValue } from "@pontx/shadcn-ui";
import { ApiDirectory } from "@pontx/shadcn-ui/api-directory";
import {
  ParametersForm,
  type ParametersFormProps
} from "@pontx/shadcn-ui/playground";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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

  it.each([
    ["zh" as const, "zh-CN" as const, "8 个 API"],
    ["en" as const, "en" as const, "8 APIs"]
  ])("renders API group counts without parentheses in %s", (catalogLocale, uiLocale, accessibleCount) => {
    const api = getCatalogApi("dida365");
    expect(api).toBeDefined();

    const html = renderToStaticMarkup(createElement(ApiDirectory, {
      spec: toPontxSpec(api!, catalogLocale),
      locale: uiLocale
    }));

    expect(html).toContain(`aria-label="${accessibleCount}">8</span>`);
    expect(html).not.toMatch(/aria-label="(?:\d+ 个 API|\d+ APIs)">\(\d+\)<\/span>/);
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

  it("preserves parameter formats for specialized Playground fields", () => {
    const api = getCatalogApi("frankfurter");
    const operation = api?.operations.find(
      (item) => item.slug === "get-historical-rates"
    );
    expect(api).toBeDefined();
    expect(operation).toBeDefined();

    const pontxApi = toPontxApi(api!, operation!, "en");
    const dateParameter = pontxApi.parameters?.find(
      (parameter) => parameter.name === "date"
    );
    expect(dateParameter).toBeDefined();
    expect(
      dateParameter?.schema
    ).toMatchObject({
      type: "string",
      format: "date",
      examples: ["2024-01-15"]
    });
    expect(
      pontxApi.parameters?.find((parameter) => parameter.name === "amount")
        ?.schema
    ).toMatchObject({ type: "number", format: "double" });

    const html = renderToStaticMarkup(
      createElement(ParametersForm, {
        parameters: [dateParameter!] as ParametersFormProps["parameters"],
        values: { date: "2024-01-15" },
        onChange: () => undefined
      })
    );
    expect(html).toContain('type="date"');
    expect(html).toContain("示例值:");
    expect(html).toContain("2024-01-15");
    expect(html).toContain('aria-label="将示例值填入 date"');
    expect(html).toContain(
      'aria-describedby="date-description date-example date-hint"'
    );

    const customFormatHtml = renderToStaticMarkup(
      createElement(ParametersForm, {
        parameters: [
          {
            ...dateParameter!,
            name: "compact_date",
            schema: {
              ...dateParameter!.schema,
              format: "yyyyMMdd",
              examples: ["20240115"]
            }
          }
        ] as ParametersFormProps["parameters"],
        values: { compact_date: "20260811" },
        onChange: () => undefined
      })
    );
    expect(customFormatHtml).toContain('type="date"');
    expect(customFormatHtml).toContain('value="2026-08-11"');
    expect(customFormatHtml).toContain("格式: yyyyMMdd");
    expect(customFormatHtml).toContain(">20240115</code>");

    const utcDateTimeHtml = renderToStaticMarkup(
      createElement(ParametersForm, {
        parameters: [
          {
            ...dateParameter!,
            name: "requested_at",
            schema: {
              ...dateParameter!.schema,
              format: "date-time",
              examples: ["2024-01-15T08:30:45Z"]
            }
          }
        ] as ParametersFormProps["parameters"],
        values: { requested_at: "2026-08-11T12:34:56Z" },
        onChange: () => undefined
      })
    );
    expect(utcDateTimeHtml).toContain('type="datetime-local"');
    expect(utcDateTimeHtml).toContain('step="1"');
    expect(utcDateTimeHtml).toContain('value="2026-08-11T12:34:56"');
    expect(utcDateTimeHtml).toContain(">2024-01-15T08:30:45Z</code>");

    const timestampHtml = renderToStaticMarkup(
      createElement(ParametersForm, {
        parameters: [
          {
            ...dateParameter!,
            name: "created_at",
            schema: {
              ...dateParameter!.schema,
              type: "integer",
              format: "timestamp-ms",
              examples: ["1705311045123"]
            }
          }
        ] as unknown as ParametersFormProps["parameters"],
        values: { created_at: "1786451696123" },
        onChange: () => undefined
      })
    );
    expect(timestampHtml).toContain('type="datetime-local"');
    expect(timestampHtml).toContain('step="0.001"');
    expect(timestampHtml).toContain('value="2026-08-11T12:34:56.123"');
    expect(timestampHtml).toContain(">1705311045123</code>");

    const temporalMatrixHtml = renderToStaticMarkup(
      createElement(ParametersForm, {
        parameters: [
          {
            ...dateParameter!,
            name: "billing_month",
            schema: { type: "string", format: "yyyyMM" }
          },
          {
            ...dateParameter!,
            name: "daily_cutoff",
            schema: { type: "string", format: "HH:mm:ssXX" }
          },
          {
            ...dateParameter!,
            name: "precise_at",
            schema: { type: "integer", format: "timestamp-ns" }
          },
          {
            ...dateParameter!,
            name: "offset_at",
            schema: {
              type: "string",
              format: "yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSSXXX"
            }
          }
        ] as unknown as ParametersFormProps["parameters"],
        values: {
          billing_month: "202608",
          daily_cutoff: "18:30:00+0800",
          precise_at: "1786451696123456789",
          offset_at: "2026-08-11T12:34:56.123456789+08:00"
        },
        onChange: () => undefined
      })
    );
    expect(temporalMatrixHtml).toContain('type="month"');
    expect(temporalMatrixHtml).toContain('value="2026-08"');
    expect(temporalMatrixHtml).toContain('type="time"');
    expect(temporalMatrixHtml).toContain('value="18:30:00"');
    expect(temporalMatrixHtml.match(/step="0.001"/g)).toHaveLength(2);
    expect(
      temporalMatrixHtml.match(/value="2026-08-11T12:34:56.123"/g)
    ).toHaveLength(2);
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

  it("prefills one coherent successful request and clears unresolved values", () => {
    const ratesApi = getCatalogApi("frankfurter");
    const rates = ratesApi?.operations.find(
      (item) => item.slug === "get-latest-rates"
    );
    const ratesExample = rates?.requestExamples[0];
    expect(ratesExample).toBeDefined();

    const adaptedRates = toPontxApi(ratesApi!, rates!, "en", {
      parameterExamples: "required",
      requestExample: ratesExample
    });
    expect(
      Object.fromEntries(
        (adaptedRates.parameters ?? [])
          .filter((parameter) => parameter.in === "query")
          .map((parameter) => [parameter.name, getSchemaInputValue(parameter.schema)])
          .filter(([, value]) => value !== "")
      )
    ).toEqual({ amount: "100", base: "USD" });

    const dida = getCatalogApi("dida365");
    const task = dida?.operations.find(
      (item) => item.slug === "get-task-by-project-id-and-task-id"
    );
    const adaptedTask = toPontxApi(dida!, task!, "en", {
      requestExample: task?.requestExamples[0]
    });
    expect(
      Object.fromEntries(
        (adaptedTask.parameters ?? [])
          .filter((parameter) => parameter.in === "path")
          .map((parameter) => [parameter.name, getSchemaInputValue(parameter.schema)])
      )
    ).toEqual({ projectId: "", taskId: "" });
  });
});
