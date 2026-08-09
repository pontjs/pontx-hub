import { siteUrl } from "~/lib/http";

export function loader() {
  return new Response(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /*?q=",
      `Sitemap: ${siteUrl("/sitemap.xml")}`
    ].join("\n"),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600"
      }
    }
  );
}
