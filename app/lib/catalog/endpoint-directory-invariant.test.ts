import { describe, expect, it } from "vitest";
import type { PontxSpec } from "@pontx/spec";
import { getPontxSpec, listCatalog } from "./catalog.server";
import { pontxDirectorySpec, pontxEndpointName } from "./pontx-view";
import { localize, type Locale } from "./types";

const locales: Locale[] = ["zh", "en"];

describe("Endpoint directory identity invariant", () => {
  it.each(locales)(
    "preserves every product's PontxSpec name and readable label in %s",
    (locale) => {
      const catalog = listCatalog();
      expect(catalog.length).toBeGreaterThan(0);

      let endpointCount = 0;
      for (const api of catalog) {
        const fullSpec = getPontxSpec(api.slug, locale)!;
        const current = api.operations[0];
        expect(current, `${api.slug} must publish at least one Endpoint`).toBeDefined();

        const slimSpec = {
          ...fullSpec,
          apis: { [current.apiKey]: fullSpec.apis[current.apiKey] }
        } as PontxSpec;
        const directorySpec = pontxDirectorySpec(slimSpec, api.operations, locale);

        expect(Object.keys(directorySpec.apis), `${api.slug} directory keys`).toEqual(
          api.operations.map((operation) => operation.apiKey)
        );

        for (const operation of api.operations) {
          endpointCount += 1;
          expect(fullSpec.apis[operation.apiKey], `${api.slug}/${operation.apiKey}`).toBeDefined();

          const directoryEndpoint = directorySpec.apis[operation.apiKey];
          expect(directoryEndpoint, `${api.slug}/${operation.operationId}`).toBeDefined();
          expect(directoryEndpoint.name).toBe(operation.apiKey);
          expect(directoryEndpoint.name!.split("/").at(-1)).toBe(
            pontxEndpointName(operation)
          );
          expect(directoryEndpoint.title ?? directoryEndpoint.summary).toBe(
            localize(operation.title, locale)
          );
          expect(directoryEndpoint.ext).toMatchObject({
            operationSlug: operation.slug,
            canonicalApiKey: operation.apiKey
          });
        }
      }

      expect(endpointCount).toBeGreaterThan(0);
    }
  );

  it("rebuilds every Dida365 group from a one-Endpoint route payload", () => {
    const api = listCatalog().find((candidate) => candidate.slug === "dida365")!;
    const fullSpec = getPontxSpec(api.slug, "en")!;
    const current = api.operations.find(
      (operation) => operation.operationId === "getUserProjects"
    )!;
    const slimSpec = {
      ...fullSpec,
      apis: { [current.apiKey]: fullSpec.apis[current.apiKey] }
    } as PontxSpec;
    const directorySpec = pontxDirectorySpec(slimSpec, api.operations, "en");

    expect(Object.keys(directorySpec.apis)).toHaveLength(api.operations.length);
    expect(Object.keys(directorySpec.apis)).toContain("project/createProject");
    expect(Object.keys(directorySpec.apis)).toContain("task/createTask");
    expect(Object.keys(directorySpec.apis)).toContain("projectGroup/getProjectGroups");
    expect(directorySpec.apis["project/createProject"].name).toBe("project/createProject");
  });
});
