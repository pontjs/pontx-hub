import { describe, expect, it } from "vitest";
import { getCatalogApi, getPontxSpec } from "~/lib/catalog/catalog.server";
import {
  loader as apiLayoutLoader,
  shouldRevalidate
} from "./api-layout";
import { loader as endpointLoader } from "./operation-detail";
import { loader as schemaLoader } from "./schema-detail";

describe("layered API route data", () => {
  it("reuses a product summary while navigating within the same API", () => {
    expect(shouldRevalidate({
      currentParams: { locale: "en", apiSlug: "twelve-data-forex" },
      nextParams: {
        locale: "en",
        apiSlug: "twelve-data-forex",
        operationSlug: "get-exchange-rate"
      },
      defaultShouldRevalidate: true
    } as never)).toBe(false);

    expect(shouldRevalidate({
      currentParams: { locale: "en", apiSlug: "twelve-data-forex" },
      nextParams: { locale: "en", apiSlug: "frankfurter" },
      defaultShouldRevalidate: true
    } as never)).toBe(true);
  });

  it("keeps dense initial and sibling route payloads far below the former full product payload", async () => {
    const api = getCatalogApi("twelve-data-forex")!;
    const spec = getPontxSpec(api.slug, "en")!;
    const endpoint = api.operations[0];
    const schema = api.schemas[0];
    const parent = apiLayoutLoader({
      params: { locale: "en", apiSlug: api.slug }
    } as never);
    const endpointDetail = await endpointLoader({
      params: {
        locale: "en",
        apiSlug: api.slug,
        operationSlug: endpoint.slug
      }
    } as never);
    const schemaDetail = schemaLoader({
      params: {
        locale: "en",
        apiSlug: api.slug,
        schemaName: schema.name
      }
    } as never);

    const formerPayloadSize = JSON.stringify({ api, spec, endpoint }).length;
    const parentSize = JSON.stringify(parent).length;
    const endpointSize = JSON.stringify(endpointDetail).length;
    const schemaSize = JSON.stringify(schemaDetail).length;

    expect(parent.api.operations[0]).not.toHaveProperty("parameters");
    expect(parent.api.schemas[0]).not.toHaveProperty("schema");
    expect(parentSize + endpointSize).toBeLessThan(formerPayloadSize / 3);
    expect(endpointSize).toBeLessThan(formerPayloadSize / 3);
    expect(schemaSize).toBeLessThan(formerPayloadSize / 3);
  });
});
