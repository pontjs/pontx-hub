import { describe, expect, it } from "vitest";
import { listCatalog } from "./catalog.server";
import {
  catalogApiContext,
  productMetadata
} from "./metadata.server";
import { withCurrentOperation, withCurrentSchema } from "./page-context";

describe("resource page context", () => {
  it("replaces the current Endpoint detail without changing directory order", () => {
    const product = listCatalog().find(
      (candidate) => candidate.slug === "currencybeacon-rest"
    )!;
    const api = catalogApiContext(productMetadata(product));
    const operation = product.operations.find(
      (candidate) => candidate.operationId === "getTimeseries"
    )!;
    const originalOrder = api.operations.map((candidate) => candidate.slug);
    const originalIndex = originalOrder.indexOf(operation.slug);

    const result = withCurrentOperation(api, operation);

    expect(originalIndex).toBeGreaterThan(0);
    expect(result.operations.map((candidate) => candidate.slug)).toEqual(
      originalOrder
    );
    expect(result.operations[originalIndex]).toBe(operation);
  });

  it("adds the current Endpoint when the directory has not loaded yet", () => {
    const product = listCatalog().find(
      (candidate) => candidate.slug === "currencybeacon-rest"
    )!;
    const api = {
      ...catalogApiContext(productMetadata(product)),
      operations: []
    };
    const operation = product.operations[3];

    expect(withCurrentOperation(api, operation).operations).toEqual([
      operation
    ]);
  });

  it("replaces the current Schema detail without changing directory order", () => {
    const product = listCatalog().find(
      (candidate) => candidate.schemas.length > 2
    )!;
    const api = catalogApiContext(productMetadata(product));
    const schema = product.schemas[2];
    const originalOrder = api.schemas.map((candidate) => candidate.name);

    const result = withCurrentSchema(api, schema);

    expect(result.schemas.map((candidate) => candidate.name)).toEqual(
      originalOrder
    );
    expect(result.schemas[2]).toBe(schema);
  });
});
