import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "~/db/client.server";
import { userApiFavorites } from "~/db/schema";
import { readAccountsConfiguration } from "./config.server";
import {
  endpointFavoriteStorageKey,
  parseEndpointFavoriteStorageKey,
  type FavoriteEndpointIdentity
} from "./favorites";
import { accountUserId, requireAccountUserId } from "./session.server";

export async function listFavoriteEndpointsForUser(
  userId: string
): Promise<FavoriteEndpointIdentity[]> {
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") throw new Response("Not found", { status: 404 });
  const rows = await getDatabase(configuration.databaseUrl)
    .select({
      favoriteKey: userApiFavorites.apiSlug
    })
    .from(userApiFavorites)
    .where(eq(userApiFavorites.userId, userId))
    .orderBy(asc(userApiFavorites.createdAt));
  return rows.flatMap(({ favoriteKey }) => {
    const favorite = parseEndpointFavoriteStorageKey(favoriteKey);
    return favorite ? [favorite] : [];
  });
}

export async function listFavoriteEndpoints(
  request: Request
): Promise<FavoriteEndpointIdentity[]> {
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") return [];
  try {
    const userId = await accountUserId(request);
    if (!userId) return [];
    return await listFavoriteEndpointsForUser(userId);
  } catch {
    return [];
  }
}

export async function addEndpointFavorite(
  request: Request,
  favorite: FavoriteEndpointIdentity
) {
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") throw new Response("Not found", { status: 404 });
  const userId = await requireAccountUserId(request);
  await getDatabase(configuration.databaseUrl)
    .insert(userApiFavorites)
    .values({ userId, apiSlug: endpointFavoriteStorageKey(favorite) })
    .onConflictDoNothing();
}

export async function removeEndpointFavorite(
  request: Request,
  favorite: FavoriteEndpointIdentity
) {
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") throw new Response("Not found", { status: 404 });
  const userId = await requireAccountUserId(request);
  await getDatabase(configuration.databaseUrl)
    .delete(userApiFavorites)
    .where(and(
      eq(userApiFavorites.userId, userId),
      eq(userApiFavorites.apiSlug, endpointFavoriteStorageKey(favorite))
    ));
}
