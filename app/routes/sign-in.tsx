import { useState } from "react";
import { redirect } from "react-router";
import type { Route } from "./+types/sign-in";
import { SiteShell } from "~/components/site-shell";
import { authClient } from "~/lib/accounts/auth-client";
import { readAccountsConfiguration } from "~/lib/accounts/config.server";
import { safeAccountReturnTo } from "~/lib/accounts/return-to";
import { requireLocale } from "~/lib/http";

export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") {
    throw new Response("Not found", { status: 404 });
  }

  const returnTo = safeAccountReturnTo(
    new URL(request.url).searchParams.get("returnTo"),
    locale
  );
  try {
    const { auth } = await import("~/lib/accounts/auth.server");
    const session = await auth.api.getSession({ headers: request.headers });
    if (session?.user) throw redirect(returnTo);
  } catch (error) {
    if (error instanceof Response) throw error;
    // Keep the optional sign-in surface available during a database outage.
    // The auth handler still fails closed if the user attempts to sign in.
  }

  return { locale, returnTo };
}

export function meta({ data }: Route.MetaArgs) {
  const zh = data?.locale !== "en";
  return [
    { title: zh ? "登录 — Pontx Hub" : "Sign in — Pontx Hub" },
    {
      name: "description",
      content: zh
        ? "登录 Pontx Hub，同步收藏的 API 与集合。"
        : "Sign in to Pontx Hub to synchronize saved APIs and collections."
    },
    { name: "robots", content: "noindex,nofollow" }
  ];
}

export default function SignIn({ loaderData }: Route.ComponentProps) {
  const { locale, returnTo } = loaderData;
  const zh = locale === "zh";
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const signIn = async () => {
    setPending(true);
    setError(undefined);
    const result = await authClient.signIn.social({
      provider: "github",
      callbackURL: returnTo
    });
    if (result.error) {
      setPending(false);
      setError(
        zh
          ? "登录暂时不可用，请稍后重试。"
          : "Sign-in is temporarily unavailable. Please try again."
      );
    }
  };

  return (
    <SiteShell locale={locale}>
      <main className="account-page">
        <section className="sign-in-panel" aria-labelledby="sign-in-heading">
          <p className="account-eyebrow">PONTX / ACCOUNT</p>
          <h1 id="sign-in-heading">{zh ? "保存你的 API 工作台" : "Save your API workspace"}</h1>
          <p>
            {zh
              ? "登录后可跨设备同步收藏的 API 与集合。API 密钥和 OAuth Token 仍只保存在当前会话中。"
              : "Sign in to sync saved APIs and collections across devices. API keys and OAuth tokens still stay in this browser session."}
          </p>
          <button
            className="github-sign-in"
            type="button"
            disabled={pending}
            onClick={() => void signIn()}
          >
            <span aria-hidden="true">GH</span>
            {pending
              ? zh ? "正在前往 GitHub…" : "Opening GitHub…"
              : zh ? "使用 GitHub 登录" : "Continue with GitHub"}
          </button>
          {error ? <p className="account-error" role="alert">{error}</p> : null}
          <p className="account-privacy-note">
            {zh
              ? "Pontx 仅保存账户身份和收藏数据，不保存第三方 API 凭据。"
              : "Pontx stores account identity and favorites, never third-party API credentials."}
          </p>
        </section>
      </main>
    </SiteShell>
  );
}
