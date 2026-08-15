import { sitemapIndexResponse } from "~/lib/sitemap.server";

export function loader() {
  return sitemapIndexResponse();
}
