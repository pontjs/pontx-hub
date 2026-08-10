import type { Route } from "./+types/oauth-callback";

export function meta(): Route.MetaDescriptors {
  return [{ title: "OAuth callback · Pontx Hub" }, { name: "robots", content: "noindex, nofollow" }];
}

export default function OAuthCallback() {
  return <main style={{ fontFamily: "sans-serif", padding: 24 }}>
    <h1>Completing authorization…</h1>
    <p>This window will close automatically.</p>
    <script dangerouslySetInnerHTML={{ __html: `
      (() => {
        const params = new URLSearchParams(location.search);
        const payload = { type: "pontx-oauth-callback", code: params.get("code"), state: params.get("state"), error: params.get("error"), errorDescription: params.get("error_description") };
        if (window.opener && window.opener !== window) { window.opener.postMessage(payload, location.origin); window.close(); }
        else { sessionStorage.setItem("pontx:oauth:return", JSON.stringify(payload)); location.replace(sessionStorage.getItem("pontx:oauth:return-url") || "/"); }
      })();
    ` }} />
  </main>;
}
