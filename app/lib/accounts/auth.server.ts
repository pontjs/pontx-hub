import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDatabase } from "~/db/client.server";
import {
  authAccounts,
  authRateLimits,
  authSessions,
  authUsers,
  authVerifications
} from "~/db/schema";
import { requireAccountsConfiguration } from "./config.server";
import { removeIdentityProviderTokens } from "./security";

const configuration = requireAccountsConfiguration();
const database = getDatabase(configuration.databaseUrl);

export const auth = betterAuth({
  appName: "Pontx Hub",
  baseURL: configuration.baseUrl,
  secret: configuration.secret,
  trustedOrigins: configuration.trustedOrigins,
  database: drizzleAdapter(database, {
    provider: "pg",
    schema: {
      user: authUsers,
      session: authSessions,
      account: authAccounts,
      verification: authVerifications,
      rateLimit: authRateLimits
    }
  }),
  rateLimit: {
    enabled: true,
    storage: "database"
  },
  socialProviders: {
    github: {
      clientId: configuration.githubClientId,
      clientSecret: configuration.githubClientSecret
    }
  },
  databaseHooks: {
    account: {
      create: {
        before: async (account) => ({ data: removeIdentityProviderTokens(account) })
      },
      update: {
        before: async (account) => ({ data: removeIdentityProviderTokens(account) })
      }
    }
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID()
    }
  }
});
