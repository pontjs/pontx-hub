export type OAuthTokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scopes: string[];
};

export type OAuthClientCredentials = {
  clientId: string;
  clientSecret?: string;
};

export function randomOAuthValue(bytes = 32): string {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...values)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function postOAuthToken(payload: Record<string, unknown>): Promise<OAuthTokenSet> {
  const response = await fetch("/api/v1/oauth/token", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json() as { data?: { accessToken: string; refreshToken?: string; expiresIn?: number; scopes: string[] }; error?: { message?: string } };
  if (!response.ok || !result.data) throw new Error(result.error?.message ?? "OAuth token request failed");
  return {
    accessToken: result.data.accessToken,
    refreshToken: result.data.refreshToken,
    expiresAt: result.data.expiresIn ? Date.now() + result.data.expiresIn * 1000 : undefined,
    scopes: result.data.scopes
  };
}

export function waitForOAuthPopup(popup: Window, state: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => finish(new Error("OAuth authorization timed out")), 5 * 60_000);
    const closed = window.setInterval(() => {
      if (popup.closed) finish(new Error("OAuth authorization window was closed"));
    }, 500);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "pontx-oauth-callback") return;
      if (event.data.state !== state) return finish(new Error("OAuth state validation failed"));
      if (event.data.error) return finish(new Error(event.data.errorDescription || event.data.error));
      if (!event.data.code) return finish(new Error("OAuth provider did not return an authorization code"));
      finish(undefined, event.data.code);
    };
    function finish(error?: Error, code?: string) {
      window.clearTimeout(timeout);
      window.clearInterval(closed);
      window.removeEventListener("message", onMessage);
      if (!popup.closed) popup.close();
      if (error) reject(error); else resolve(code!);
    }
    window.addEventListener("message", onMessage);
  });
}
