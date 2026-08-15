import type { Route } from "./+types/sitemap-page";
import { sitemapPageResponse } from "~/lib/sitemap.server";

export function loader({ params }: Route.LoaderArgs) {
  const match = /^(\d+)\.xml$/.exec(params.page ?? "");
  if (!match) throw new Response("Sitemap not found", { status: 404 });
  return sitemapPageResponse(Number(match[1]));
}
