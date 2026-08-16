import { INDEXNOW_KEY } from "~/lib/indexnow";

export function loader() {
  return new Response(INDEXNOW_KEY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400",
      "X-Robots-Tag": "noindex"
    }
  });
}
