import type { Route } from "./+types/account-api";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import {
  addApiFavorite,
  listFavoriteApiSlugsForUser,
  removeApiFavorite
} from "~/lib/accounts/favorites.server";
import { readAccountsConfiguration } from "~/lib/accounts/config.server";
import { requireAccountUserId } from "~/lib/accounts/session.server";
import {
  listPlaygroundHistoryForUser,
  removePlaygroundHistoryEntry
} from "~/lib/accounts/playground-history.server";

const HISTORY_PATH = "/api/account/v1/playground/history";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(code: string, status: number) {
  return Response.json(
    { error: { code } },
    { status, headers: { "Cache-Control": "private, no-store" } }
  );
}

function jsonData(data: unknown) {
  return Response.json(
    { data },
    { headers: { "Cache-Control": "private, no-store" } }
  );
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

function historyEntryIdFrom(request: Request): string | undefined {
  const match = new URL(request.url).pathname.match(
    /^\/api\/account\/v1\/playground\/history\/([^/]+)$/
  );
  if (!match) return undefined;
  try {
    const id = decodeURIComponent(match[1]);
    return UUID_PATTERN.test(id) ? id : undefined;
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
  const url = new URL(request.url);
  if (
    url.pathname !== "/api/account/v1/favorites/apis" &&
    url.pathname !== HISTORY_PATH
  ) {
    return jsonError("not_found", 404);
  }
  try {
    const userId = await requireAccountUserId(request);
    if (url.pathname === HISTORY_PATH) {
      const requestedLimit = Number(url.searchParams.get("limit") ?? 50);
      const limit = Number.isFinite(requestedLimit) ? requestedLimit : 50;
      return jsonData({
        entries: await listPlaygroundHistoryForUser(userId, limit)
      });
    }
    return jsonData({ apiSlugs: await listFavoriteApiSlugsForUser(userId) });
  } catch (error) {
    if (error instanceof Response && error.status === 401) return jsonError("unauthorized", 401);
    return jsonError("accounts_unavailable", 503);
  }
}

export async function action({ request }: Route.ActionArgs) {
  const unavailable = accountsAvailable();
  if (unavailable) return unavailable;
  if (!sameOrigin(request)) return jsonError("invalid_origin", 403);

  const historyEntryId = historyEntryIdFrom(request);
  if (historyEntryId) {
    if (request.method !== "DELETE") return jsonError("method_not_allowed", 405);
    try {
      const userId = await requireAccountUserId(request);
      await removePlaygroundHistoryEntry(userId, historyEntryId);
      return jsonData({ id: historyEntryId, deleted: true });
    } catch (error) {
      if (error instanceof Response && error.status === 401) {
        return jsonError("unauthorized", 401);
      }
      return jsonError("accounts_unavailable", 503);
    }
  }

  const apiSlug = apiSlugFrom(request);
  if (!apiSlug) return jsonError("not_found", 404);
  if (!getCatalogApi(apiSlug)) return jsonError("unknown_api", 404);

  try {
    if (request.method === "PUT") {
      await addApiFavorite(request, apiSlug);
      return jsonData({ apiSlug, saved: true });
    }
    if (request.method === "DELETE") {
      await removeApiFavorite(request, apiSlug);
      return jsonData({ apiSlug, saved: false });
    }
    return jsonError("method_not_allowed", 405);
  } catch (error) {
    if (error instanceof Response && error.status === 401) return jsonError("unauthorized", 401);
    return jsonError("accounts_unavailable", 503);
  }
}
