import type { Route } from "./+types/internal-api";

export function loader({ request, params }: Route.LoaderArgs) {
  if (params["*"] !== "cron/check-specs") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const expected = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expected || authorization !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    message: "Catalog candidate synchronization is not enabled until storage is configured."
  });
}
