import { redirect } from "react-router";
import type { Route } from "./+types/endpoint-legacy-redirect";
import { getCatalogOperation } from "~/lib/catalog/catalog.server";
import { requireLocale } from "~/lib/http";

export function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const match = getCatalogOperation(params.apiSlug ?? "", params.operationSlug ?? "");
  if (!match) throw new Response("Endpoint not found", { status: 404 });
  const search = new URL(request.url).search;
  return redirect(`/${locale}/apis/${match.api.slug}/${match.operation.slug}${search}`, 301);
}

export default function EndpointLegacyRedirect() {
  return null;
}
