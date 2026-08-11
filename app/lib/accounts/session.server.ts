import { readAccountsConfiguration } from "./config.server";

export async function accountUserId(request: Request): Promise<string | undefined> {
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") return undefined;
  const { auth } = await import("./auth.server");
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id;
}

export async function requireAccountUserId(request: Request): Promise<string> {
  const userId = await accountUserId(request);
  if (!userId) throw new Response("Unauthorized", { status: 401 });
  return userId;
}
