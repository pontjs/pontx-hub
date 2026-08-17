import type { Route } from "./+types/api-catalog";
import { siteUrl } from "~/lib/http";

const CONTENT_TYPE = 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"';

export function loader({ request }: Route.LoaderArgs) {
  const sharedLinks = {
    "service-desc": [{ href: siteUrl("/openapi.json"), type: "application/vnd.oai.openapi+json" }],
    "service-doc": [
      { href: siteUrl("/en/docs/agent-discovery"), hreflang: ["en"] },
      { href: siteUrl("/zh/docs/agent-discovery"), hreflang: ["zh-CN"] }
    ],
    "service-meta": [{
      href: siteUrl("/.well-known/agent-skills/index.json"),
      type: "application/json"
    }]
  };
  const body = JSON.stringify({
    linkset: [
      { anchor: siteUrl("/api/v2/products"), ...sharedLinks },
      { anchor: siteUrl("/api/v2/search"), ...sharedLinks }
    ]
  });

  return new Response(request.method === "HEAD" ? null : body, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": CONTENT_TYPE,
      "Content-Length": String(Buffer.byteLength(body)),
      Link: '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
      "X-Content-Type-Options": "nosniff"
    }
  });
}
