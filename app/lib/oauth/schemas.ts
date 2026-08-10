import { z } from "zod";

export const oauthTokenRequestSchema = z.object({
  apiSlug: z.string().regex(/^[a-z0-9-]+$/),
  schemeId: z.string().min(1).max(128),
  grantType: z.enum(["authorization_code", "client_credentials", "refresh_token"]),
  clientId: z.string().min(1).max(2048),
  clientSecret: z.string().max(8192).optional(),
  code: z.string().max(8192).optional(),
  codeVerifier: z.string().min(43).max(128).optional(),
  refreshToken: z.string().max(8192).optional(),
  redirectUri: z.string().url().optional(),
  scopes: z.array(z.string().max(512)).max(100).default([])
});

export type OAuthTokenRequest = z.infer<typeof oauthTokenRequestSchema>;
