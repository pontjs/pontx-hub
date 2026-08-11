import type { Route } from "./+types/account-api";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import {
  addApiFavorite,
  listFavoriteApiSlugsForUser,
  removeApiFavorite,
  requireAccountUserId
} from "~/lib/accounts/favorites.server";
import { readAccountsConfiguration } from "~/lib/accounts/config.server";

function jsonError(code: string, status: number) {
  return Response.json({ error: { code } }, { status });
}

function accountsAvailable() {
  const configuration = readAccountsConfiguration();
  if (configuration.status === "disabled") return jsonError("not_found", 404);
  if (configuration.status === "invalid") return jsonError("accounts_unavailable", 503);
}

function apiSlugFrom(request: Request): string | undefined {
  const match = new URL(request.url).pathname.match(
    /^\/api\/account\/v1\/favorites\/apis\/([^/]+)$/
  );
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function loader({ request }: Route.LoaderArgs) {
  const unavailable = accountsAvailable();
  if (unavailable) return unavailable;
  if (new URL(request.url).pathname !== "/api/account/v1/favorites/apis") {
    return jsonError("not_found", 404);
  }
  try {
    const userId = await requireAccountUserId(request);
    return Response.json({ data: { apiSlugs: await listFavoriteApiSlugsForUser(userId) } });
  } catch (error) {
    if (error instanceof Response && error.status === 401) return jsonError("unauthorized", 401);
    return jsonError("accounts_unavailable", 503);
  }
}

export async function action({ request }: Route.ActionArgs) {
  const unavailable = accountsAvailable();
  if (unavailable) return unavailable;
  if (!sameOrigin(request)) return jsonError("invalid_origin", 403);

  const apiSlug = apiSlugFrom(request);
  if (!apiSlug) return jsonError("not_found", 404);
  if (!getCatalogApi(apiSlug)) return jsonError("unknown_api", 404);

  try {
    if (request.method === "PUT") {
      await addApiFavorite(request, apiSlug);
      return Response.json({ data: { apiSlug, saved: true } });
    }
    if (request.method === "DELETE") {
      await removeApiFavorite(request, apiSlug);
      return Response.json({ data: { apiSlug, saved: false } });
    }
    return jsonError("method_not_allowed", 405);
  } catch (error) {
    if (error instanceof Response && error.status === 401) return jsonError("unauthorized", 401);
    return jsonError("accounts_unavailable", 503);
  }
}
