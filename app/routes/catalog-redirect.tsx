import { redirect } from "react-router";
import type { Route } from "./+types/catalog-redirect";
import { requireLocale } from "~/lib/http";

export function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const url = new URL(request.url);
  return redirect(`/${locale}${url.search}`, 301);
}

export default function CatalogRedirect() {
  return null;
}
