import { HTTPException } from "hono/http-exception";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import type { CatalogAuthScheme, OAuthFlow } from "~/lib/catalog/types";
import { assertPublicHost } from "~/lib/playground/network.server";
import type { OAuthTokenRequest } from "./schemas";

const TOKEN_RESPONSE_LIMIT = 256 * 1024;

function oauthScheme(apiSlug: string, schemeId: string) {
  const api = getCatalogApi(apiSlug);
  const scheme = api?.auth.find(
    (candidate): candidate is Extract<CatalogAuthScheme, { type: "oauth2" }> =>
      candidate.id === schemeId && candidate.type === "oauth2"
  );
  if (!api || !scheme) throw new HTTPException(404, { message: "OAuth scheme not found" });
  return scheme;
}

function flowFor(scheme: ReturnType<typeof oauthScheme>, grantType: OAuthTokenRequest["grantType"]): OAuthFlow {
  const flow = grantType === "client_credentials"
    ? scheme.flows?.clientCredentials
    : scheme.flows?.authorizationCode;
  if (!flow) throw new HTTPException(422, { message: "OAuth grant is not configured for this API" });
  return flow;
}

function validateScopes(flow: OAuthFlow, scopes: string[]) {
  const allowed = new Set(Object.keys(flow.scopes));
  if (scopes.some((scope) => !allowed.has(scope))) {
    throw new HTTPException(422, { message: "One or more OAuth scopes are not approved" });
  }
}

function formEncode(value: string): string {
  return new URLSearchParams({ value }).toString().slice("value=".length);
}

export async function exchangeOAuthToken(input: OAuthTokenRequest) {
  const scheme = oauthScheme(input.apiSlug, input.schemeId);
  const flow = flowFor(scheme, input.grantType);
  validateScopes(flow, input.scopes);
  const target = new URL(flow.tokenUrl);
  await assertPublicHost(target.hostname);

  const form = new URLSearchParams({ grant_type: input.grantType });
  if (input.grantType === "authorization_code") {
    if (!input.code || !input.redirectUri) throw new HTTPException(422, { message: "Authorization code and redirect URI are required" });
    form.set("code", input.code);
    form.set("redirect_uri", input.redirectUri);
    if (scheme.pkce === "required" && !input.codeVerifier) throw new HTTPException(422, { message: "PKCE verifier is required" });
    if (input.codeVerifier) form.set("code_verifier", input.codeVerifier);
  } else if (input.grantType === "refresh_token") {
    if (!input.refreshToken) throw new HTTPException(422, { message: "Refresh token is required" });
    form.set("refresh_token", input.refreshToken);
  } else if (input.scopes.length) {
    form.set("scope", input.scopes.join(" "));
  }

  const method = scheme.tokenEndpointAuthMethod ?? "client_secret_basic";
  const headers = new Headers({ "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" });
  if (method === "client_secret_basic") {
    if (!input.clientSecret) throw new HTTPException(422, { message: "Client secret is required" });
    headers.set("Authorization", `Basic ${Buffer.from(`${formEncode(input.clientId)}:${formEncode(input.clientSecret)}`).toString("base64")}`);
  } else {
    form.set("client_id", input.clientId);
    if (method === "client_secret_post") {
      if (!input.clientSecret) throw new HTTPException(422, { message: "Client secret is required" });
      form.set("client_secret", input.clientSecret);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(target, { method: "POST", headers, body: form, redirect: "manual", signal: controller.signal });
    if (response.status >= 300 && response.status < 400) throw new HTTPException(502, { message: "OAuth provider redirects are not followed" });
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > TOKEN_RESPONSE_LIMIT) throw new HTTPException(413, { message: "OAuth response is too large" });
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > TOKEN_RESPONSE_LIMIT) throw new HTTPException(413, { message: "OAuth response is too large" });
    let body: Record<string, unknown>;
    try { body = JSON.parse(text) as Record<string, unknown>; } catch { throw new HTTPException(502, { message: "OAuth provider returned an invalid response" }); }
    if (!response.ok || typeof body.access_token !== "string") {
      throw new HTTPException(502, { message: typeof body.error === "string" ? `OAuth provider rejected the request: ${body.error}` : "OAuth provider rejected the request" });
    }
    const expiresIn = typeof body.expires_in === "number"
      ? body.expires_in
      : typeof body.expires_in === "string" && /^\d+$/.test(body.expires_in)
        ? Number(body.expires_in)
        : undefined;
    return {
      accessToken: body.access_token,
      tokenType: typeof body.token_type === "string" ? body.token_type : "Bearer",
      ...(typeof body.refresh_token === "string" ? { refreshToken: body.refresh_token } : {}),
      ...(expiresIn !== undefined ? { expiresIn } : {}),
      scopes: typeof body.scope === "string" ? body.scope.split(/\s+/).filter(Boolean) : input.scopes
    };
  } finally {
    clearTimeout(timeout);
  }
}
