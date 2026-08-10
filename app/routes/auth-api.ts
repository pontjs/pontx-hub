import type { Route } from "./+types/auth-api";
import { readAccountsConfiguration } from "~/lib/accounts/config.server";

async function handle(request: Request): Promise<Response> {
  const configuration = readAccountsConfiguration();
  if (configuration.status === "disabled") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  if (configuration.status === "invalid") {
    return Response.json({ error: "accounts_unavailable" }, { status: 503 });
  }

  const { auth } = await import("~/lib/accounts/auth.server");
  return auth.handler(request);
}

export function loader({ request }: Route.LoaderArgs) {
  return handle(request);
}

export function action({ request }: Route.ActionArgs) {
  return handle(request);
}
