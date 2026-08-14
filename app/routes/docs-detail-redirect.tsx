import { redirect } from "react-router";
import type { Route } from "./+types/docs-detail-redirect";
import { isDocSlug } from "~/lib/docs";
import { preferredLocale } from "~/lib/i18n";

export function loader({ params, request }: Route.LoaderArgs) {
  if (!isDocSlug(params.docSlug) || params.docSlug === "overview") {
    throw new Response("Documentation page not found", { status: 404 });
  }
  const locale = preferredLocale(request.headers.get("accept-language"));
  const search = new URL(request.url).search;
  return redirect(`/${locale}/docs/${params.docSlug}${search}`, 302);
}

export default function DocsDetailRedirect() {
  return null;
}
