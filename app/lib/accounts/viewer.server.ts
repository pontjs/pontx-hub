import { readAccountsConfiguration } from "./config.server";

export type AccountViewer = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export type AccountsViewerState = {
  enabled: boolean;
  viewer: AccountViewer | null;
};

export async function loadAccountsViewer(request: Request): Promise<AccountsViewerState> {
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") return { enabled: false, viewer: null };

  try {
    const { auth } = await import("./auth.server");
    const session = await auth.api.getSession({ headers: request.headers });
    return {
      enabled: true,
      viewer: session?.user
        ? {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image
          }
        : null
    };
  } catch {
    // Account availability must never take down the public catalog.
    return { enabled: true, viewer: null };
  }
}
