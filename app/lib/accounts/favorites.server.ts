import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "~/db/client.server";
import { userApiFavorites } from "~/db/schema";
import { readAccountsConfiguration } from "./config.server";
import { accountUserId, requireAccountUserId } from "./session.server";

export async function listFavoriteApiSlugsForUser(userId: string): Promise<string[]> {
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") throw new Response("Not found", { status: 404 });
  const rows = await getDatabase(configuration.databaseUrl)
    .select({ apiSlug: userApiFavorites.apiSlug })
    .from(userApiFavorites)
    .where(eq(userApiFavorites.userId, userId))
    .orderBy(asc(userApiFavorites.createdAt));
  return rows.map((row) => row.apiSlug);
}

export async function listFavoriteApiSlugs(request: Request): Promise<string[]> {
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") return [];
  try {
    const userId = await accountUserId(request);
    if (!userId) return [];
    return await listFavoriteApiSlugsForUser(userId);
  } catch {
    return [];
  }
}

export async function addApiFavorite(request: Request, apiSlug: string) {
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") throw new Response("Not found", { status: 404 });
  const userId = await requireAccountUserId(request);
  await getDatabase(configuration.databaseUrl)
    .insert(userApiFavorites)
    .values({ userId, apiSlug })
    .onConflictDoNothing();
}

export async function removeApiFavorite(request: Request, apiSlug: string) {
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") throw new Response("Not found", { status: 404 });
  const userId = await requireAccountUserId(request);
  await getDatabase(configuration.databaseUrl)
    .delete(userApiFavorites)
    .where(and(
      eq(userApiFavorites.userId, userId),
      eq(userApiFavorites.apiSlug, apiSlug)
    ));
}
