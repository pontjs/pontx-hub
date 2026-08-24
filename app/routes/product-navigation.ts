import type { Route } from "./+types/product-navigation";
import {
  catalogApiContext,
  getProductMetadata
} from "~/lib/catalog/metadata.server";
import { cacheHeaders } from "~/lib/http";
import type { CatalogProductNavigation } from "~/lib/catalog/types";

export function loader({ params }: Route.LoaderArgs): CatalogProductNavigation {
  const product = getProductMetadata(params.apiSlug ?? "");
  if (!product) throw new Response("API not found", { status: 404 });
  const api = catalogApiContext(product);
  return {
    operations: api.operations,
    schemas: api.schemas,
    endpointCount: api.endpointCount ?? api.operations.length,
    schemaCount: api.schemaCount ?? api.schemas.length,
    executableEndpointCount: api.executableEndpointCount ?? 0,
    ...(api.defaultEndpointSlug
      ? { defaultEndpointSlug: api.defaultEndpointSlug }
      : {}),
    ...(api.defaultSchemaName
      ? { defaultSchemaName: api.defaultSchemaName }
      : {})
  };
}

export function headers() {
  return cacheHeaders();
}
