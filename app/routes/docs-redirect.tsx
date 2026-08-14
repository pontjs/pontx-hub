import { redirect } from "react-router";
import type { Route } from "./+types/docs-redirect";
import { preferredLocale } from "~/lib/i18n";

export function loader({ request }: Route.LoaderArgs) {
  const locale = preferredLocale(request.headers.get("accept-language"));
  const search = new URL(request.url).search;
  return redirect(`/${locale}/docs${search}`, 302);
}

export default function DocsRedirect() {
  return null;
}
