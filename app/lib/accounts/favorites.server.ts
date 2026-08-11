import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "~/db/client.server";
import { userEndpointFavorites } from "~/db/schema";
import { readAccountsConfiguration } from "./config.server";
import type { FavoriteEndpointIdentity } from "./favorites";
import { accountUserId, requireAccountUserId } from "./session.server";

export async function listFavoriteEndpointsForUser(
  userId: string
): Promise<FavoriteEndpointIdentity[]> {
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") throw new Response("Not found", { status: 404 });
  const rows = await getDatabase(configuration.databaseUrl)
    .select({
      apiSlug: userEndpointFavorites.apiSlug,
      operationSlug: userEndpointFavorites.operationSlug
    })
    .from(userEndpointFavorites)
    .where(eq(userEndpointFavorites.userId, userId))
    .orderBy(asc(userEndpointFavorites.createdAt));
  return rows;
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
    .insert(userEndpointFavorites)
    .values({ userId, ...favorite })
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
    .delete(userEndpointFavorites)
    .where(and(
      eq(userEndpointFavorites.userId, userId),
      eq(userEndpointFavorites.apiSlug, favorite.apiSlug),
      eq(userEndpointFavorites.operationSlug, favorite.operationSlug)
    ));
}
