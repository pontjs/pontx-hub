import type { Route } from "./+types/account-api";
import { getCatalogOperation } from "~/lib/catalog/catalog.server";
import {
  addEndpointFavorite,
  listFavoriteEndpointsForUser,
  removeEndpointFavorite
} from "~/lib/accounts/favorites.server";
import { readAccountsConfiguration } from "~/lib/accounts/config.server";
import { requireAccountUserId } from "~/lib/accounts/session.server";
import {
  listPlaygroundHistoryForOperationForUser,
  listPlaygroundHistoryForUser,
  removePlaygroundHistoryEntry
} from "~/lib/accounts/playground-history.server";
import { loadAccountsViewer } from "~/lib/accounts/viewer.server";

const VIEWER_PATH = "/api/account/v1/viewer";
const HISTORY_PATH = "/api/account/v1/playground/history";
const FAVORITE_ENDPOINTS_PATH = "/api/account/v1/favorites/endpoints";
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

function endpointIdentityFrom(request: Request) {
  const match = new URL(request.url).pathname.match(
    /^\/api\/account\/v1\/favorites\/endpoints\/([^/]+)\/([^/]+)$/
  );
  if (!match) return undefined;
  try {
    return {
      apiSlug: decodeURIComponent(match[1]),
      operationSlug: decodeURIComponent(match[2])
    };
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
  const url = new URL(request.url);
  if (url.pathname === VIEWER_PATH) {
    const accounts = await loadAccountsViewer(request);
    return jsonData({
      enabled: accounts.enabled,
      viewer: accounts.viewer ? {
        id: accounts.viewer.id,
        name: accounts.viewer.name,
        image: accounts.viewer.image
      } : null
    });
  }
  const unavailable = accountsAvailable();
  if (unavailable) return unavailable;
  if (
    url.pathname !== FAVORITE_ENDPOINTS_PATH &&
    url.pathname !== HISTORY_PATH
  ) {
    return jsonError("not_found", 404);
  }
  const apiSlug = url.searchParams.get("apiSlug");
  const operationSlug = url.searchParams.get("operationSlug");
  if (
    url.pathname === HISTORY_PATH &&
    Boolean(apiSlug) !== Boolean(operationSlug)
  ) {
    return jsonError("invalid_history_filter", 422);
  }
  if (
    url.pathname === HISTORY_PATH &&
    apiSlug &&
    operationSlug &&
    !getCatalogOperation(apiSlug, operationSlug)
  ) {
    return jsonError("unknown_endpoint", 404);
  }
  try {
    const userId = await requireAccountUserId(request);
    if (url.pathname === HISTORY_PATH) {
      const requestedLimit = Number(url.searchParams.get("limit") ?? 50);
      const limit = Number.isFinite(requestedLimit) ? requestedLimit : 50;
      if (apiSlug && operationSlug) {
        return jsonData({
          entries: await listPlaygroundHistoryForOperationForUser(
            userId,
            apiSlug,
            operationSlug,
            limit
          )
        });
      }
      return jsonData({
        entries: await listPlaygroundHistoryForUser(userId, limit)
      });
    }
    return jsonData({ endpoints: await listFavoriteEndpointsForUser(userId) });
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

  const endpoint = endpointIdentityFrom(request);
  if (!endpoint) return jsonError("not_found", 404);
  if (request.method === "PUT" && !getCatalogOperation(
    endpoint.apiSlug,
    endpoint.operationSlug
  )) {
    return jsonError("unknown_endpoint", 404);
  }

  try {
    if (request.method === "PUT") {
      await addEndpointFavorite(request, endpoint);
      return jsonData({ ...endpoint, saved: true });
    }
    if (request.method === "DELETE") {
      await removeEndpointFavorite(request, endpoint);
      return jsonData({ ...endpoint, saved: false });
    }
    return jsonError("method_not_allowed", 405);
  } catch (error) {
    if (error instanceof Response && error.status === 401) return jsonError("unauthorized", 401);
    return jsonError("accounts_unavailable", 503);
  }
}
