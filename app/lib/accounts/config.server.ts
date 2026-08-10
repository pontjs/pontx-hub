export type AccountsConfiguration =
  | { status: "disabled" }
  | { status: "invalid"; missing: string[] }
  | {
      status: "ready";
      databaseUrl: string;
      secret: string;
      baseUrl: string;
      githubClientId: string;
      githubClientSecret: string;
      trustedOrigins: string[];
    };

const REQUIRED_VARIABLES = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET"
] as const;

function value(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const configured = env[name]?.trim();
  return configured || undefined;
}

function origin(input: string): string | undefined {
  try {
    return new URL(input).origin;
  } catch {
    return undefined;
  }
}

export function readAccountsConfiguration(
  env: NodeJS.ProcessEnv = process.env
): AccountsConfiguration {
  if (value(env, "PONTX_ACCOUNTS_ENABLED") !== "true") {
    return { status: "disabled" };
  }

  const missing: string[] = REQUIRED_VARIABLES.filter((name) => !value(env, name));
  const secret = value(env, "BETTER_AUTH_SECRET");
  if (secret && secret.length < 32) missing.push("BETTER_AUTH_SECRET>=32_chars");

  const baseUrl = value(env, "BETTER_AUTH_URL");
  const baseOrigin = baseUrl ? origin(baseUrl) : undefined;
  if (baseUrl && !baseOrigin) missing.push("BETTER_AUTH_URL(valid_url)");

  if (missing.length > 0 || !secret || !baseUrl || !baseOrigin) {
    return { status: "invalid", missing: [...new Set(missing)] };
  }

  const extraOrigins = (value(env, "PONTX_AUTH_TRUSTED_ORIGINS") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(origin)
    .filter((item): item is string => Boolean(item));

  return {
    status: "ready",
    databaseUrl: value(env, "DATABASE_URL")!,
    secret,
    baseUrl,
    githubClientId: value(env, "GITHUB_CLIENT_ID")!,
    githubClientSecret: value(env, "GITHUB_CLIENT_SECRET")!,
    trustedOrigins: [...new Set([baseOrigin, ...extraOrigins])]
  };
}

export function requireAccountsConfiguration(): Extract<
  AccountsConfiguration,
  { status: "ready" }
> {
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") {
    throw new Error("Pontx accounts are not configured");
  }
  return configuration;
}
