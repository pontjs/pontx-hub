import type { Route } from "./+types/product-navigation";
import { getProductNavigation } from "~/lib/catalog/metadata.server";
import { cacheHeaders } from "~/lib/http";
import type { CatalogProductNavigation } from "~/lib/catalog/types";

export function loader({ params }: Route.LoaderArgs): CatalogProductNavigation {
  const navigation = getProductNavigation(params.apiSlug ?? "");
  if (!navigation) throw new Response("API not found", { status: 404 });
  return navigation;
}

export function headers() {
  return cacheHeaders();
}
