import type {
  CatalogApiContext,
  CatalogOperation,
  CatalogSchema
} from "./types";

export function withCurrentOperation(
  api: CatalogApiContext,
  operation: CatalogOperation
): CatalogApiContext {
  return {
    ...api,
    operations: [
      operation,
      ...api.operations.filter(
        (candidate) => candidate.operationId !== operation.operationId
      )
    ]
  };
}

export function withCurrentSchema(
  api: CatalogApiContext,
  schema: CatalogSchema
): CatalogApiContext {
  return {
    ...api,
    schemas: [
      schema,
      ...api.schemas.filter((candidate) => candidate.name !== schema.name)
    ]
  };
}
