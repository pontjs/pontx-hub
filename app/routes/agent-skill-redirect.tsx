import type { Route } from "./+types/agent-skill-redirect";
import { redirect } from "react-router";
import { requireLocale } from "~/lib/http";

export function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const search = new URL(request.url).search;
  return redirect(`/${locale}/skills/pontx-hub${search}`, 301);
}
