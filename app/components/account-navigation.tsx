import { useState } from "react";
import { Link, useLocation, useRouteLoaderData } from "react-router";
import type { loader as rootLoader } from "~/root";
import type { Locale } from "~/lib/catalog/types";
import { authClient } from "~/lib/accounts/auth-client";

const copy = {
  zh: { signIn: "登录", signOut: "退出", signingOut: "退出中…", account: "账户" },
  en: { signIn: "Sign in", signOut: "Sign out", signingOut: "Signing out…", account: "Account" }
} satisfies Record<Locale, Record<string, string>>;

export function AccountNavigation({
  locale,
  onNavigate
}: {
  locale: Locale;
  onNavigate?: () => void;
}) {
  const data = useRouteLoaderData<typeof rootLoader>("root");
  const location = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const accounts = data?.accounts;

  if (!accounts?.enabled || location.pathname.includes("/sign-in")) return null;

  const text = copy[locale];
  if (!accounts.viewer) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Link
        className="account-link"
        to={`/${locale}/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
        onClick={onNavigate}
      >
        {text.signIn}
      </Link>
    );
  }

  const signOut = async () => {
    setSigningOut(true);
    const result = await authClient.signOut();
    if (result.error) {
      setSigningOut(false);
      return;
    }
    onNavigate?.();
    window.location.assign(`/${locale}`);
  };

  return (
    <>
      <span className="account-identity" title={accounts.viewer.email}>
        <span aria-hidden="true">●</span>
        <span className="account-identity-name">
          {accounts.viewer.name || text.account}
        </span>
      </span>
      <button
        className="account-sign-out"
        type="button"
        disabled={signingOut}
        onClick={() => void signOut()}
      >
        {signingOut ? text.signingOut : text.signOut}
      </button>
    </>
  );
}
