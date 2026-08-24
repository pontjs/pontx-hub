import { describe, expect, it } from "vitest";
import { getPontxSpec, listCatalog } from "~/lib/catalog/catalog.server";
import {
  loader as apiLayoutLoader,
  shouldRevalidate
} from "./api-layout";
import { loader as endpointLoader } from "./operation-detail";
import { loader as schemaLoader } from "./schema-detail";
import { loader as navigationLoader } from "./product-navigation";

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
    const api = [...listCatalog()].sort(
      (left, right) => right.schemas.length - left.schemas.length
    )[0];
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
    const navigation = navigationLoader({
      params: { apiSlug: api.slug }
    } as never);

    const formerPayloadSize = JSON.stringify({ api, spec, endpoint }).length;
    const parentSize = JSON.stringify(parent).length;
    const endpointSize = JSON.stringify(endpointDetail).length;
    const schemaSize = JSON.stringify(schemaDetail).length;

    expect(parent.api.operations).toEqual([]);
    expect(parent.api.schemas).toEqual([]);
    expect(navigation.operations).toHaveLength(api.operations.length);
    expect(navigation.schemas).toHaveLength(api.schemas.length);
    expect(Object.keys(endpointDetail.pontxSpec.apis)).toHaveLength(1);
    expect(Object.keys(schemaDetail.pontxSpec.apis)).toHaveLength(0);
    expect(parentSize).toBeLessThan(64 * 1024);
    expect(endpointSize).toBeLessThan(512 * 1024);
    expect(schemaSize).toBeLessThan(512 * 1024);
    expect(parentSize + endpointSize).toBeLessThan(formerPayloadSize / 3);
    expect(endpointSize).toBeLessThan(formerPayloadSize / 3);
    expect(schemaSize).toBeLessThan(formerPayloadSize / 3);
  });
});
