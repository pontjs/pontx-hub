import { redirect } from "react-router";
import type { Route } from "./+types/api-detail";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import { requireLocale } from "~/lib/http";

export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const api = getCatalogApi(params.apiSlug ?? "");
  if (!api) throw new Response("API not found", { status: 404 });
  return redirect(
    `/${locale}/apis/${api.slug}/${api.operations[0].slug}`,
    308
  );
}
