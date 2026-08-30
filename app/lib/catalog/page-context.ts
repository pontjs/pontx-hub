import type {
  CatalogApiContext,
  CatalogOperation,
  CatalogSchema
} from "./types";

export function withCurrentOperation(
  api: CatalogApiContext,
  operation: CatalogOperation
): CatalogApiContext {
  const currentIndex = api.operations.findIndex(
    (candidate) => candidate.slug === operation.slug
  );

  return {
    ...api,
    operations: currentIndex === -1
      ? [...api.operations, operation]
      : api.operations.map((candidate, index) =>
          index === currentIndex ? operation : candidate
        )
  };
}

export function withCurrentSchema(
  api: CatalogApiContext,
  schema: CatalogSchema
): CatalogApiContext {
  const currentIndex = api.schemas.findIndex(
    (candidate) => candidate.name === schema.name
  );

  return {
    ...api,
    schemas: currentIndex === -1
      ? [...api.schemas, schema]
      : api.schemas.map((candidate, index) =>
          index === currentIndex ? schema : candidate
        )
  };
}
