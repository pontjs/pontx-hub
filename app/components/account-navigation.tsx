import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import type { Locale } from "~/lib/catalog/types";
import { useAccount } from "~/lib/accounts/account-context";

const copy = {
  zh: {
    signIn: "登录",
    signOut: "退出",
    signingOut: "退出中…",
    account: "账户",
    menu: "打开账户菜单",
    saved: "收藏的 API",
    history: "调试历史"
  },
  en: {
    signIn: "Sign in",
    signOut: "Sign out",
    signingOut: "Signing out…",
    account: "Account",
    menu: "Open account menu",
    saved: "Saved APIs",
    history: "Playground history"
  }
} satisfies Record<Locale, Record<string, string>>;

export function AccountNavigation({
  locale,
  onNavigate
}: {
  locale: Locale;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const accountMenuRef = useRef<HTMLDetailsElement>(null);
  const accountMenuTriggerRef = useRef<HTMLElement>(null);
  const accountMenuOpenedByHoverRef = useRef(false);
  const accounts = useAccount();

  useEffect(() => {
    setImageFailed(false);
  }, [accounts?.viewer?.image]);

  useEffect(() => {
    if (!accounts?.viewer?.id) return;

    const closeAccountMenu = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        accountMenuOpenedByHoverRef.current = false;
        accountMenuRef.current?.removeAttribute("open");
      }
    };

    document.addEventListener("pointerdown", closeAccountMenu);
    return () => document.removeEventListener("pointerdown", closeAccountMenu);
  }, [accounts?.viewer?.id]);

  if (!accounts.loaded || !accounts.enabled || location.pathname.includes("/sign-in")) return null;

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
    const { authClient } = await import("~/lib/accounts/auth-client");
    const result = await authClient.signOut();
    if (result.error) {
      setSigningOut(false);
      return;
    }
    onNavigate?.();
    window.location.assign(`/${locale}`);
  };

  const closeMenu = () => {
    accountMenuOpenedByHoverRef.current = false;
    accountMenuRef.current?.removeAttribute("open");
  };

  const handleNavigate = () => {
    closeMenu();
    onNavigate?.();
  };

  const displayName = accounts.viewer.name?.trim() || text.account;
  const fallbackInitial = displayName
    .slice(0, 1)
    .toLocaleUpperCase(locale === "zh" ? "zh-CN" : "en");
  const showImage = Boolean(accounts.viewer.image) && !imageFailed;

  return (
    <details
      className="account-navigation"
      ref={accountMenuRef}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse" && !accountMenuRef.current?.open) {
          accountMenuOpenedByHoverRef.current = true;
          accountMenuRef.current?.setAttribute("open", "");
        }
      }}
      onPointerLeave={(event) => {
        accountMenuOpenedByHoverRef.current = false;
        if (
          event.pointerType === "mouse" &&
          !accountMenuRef.current?.contains(document.activeElement)
        ) {
          closeMenu();
        }
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) closeMenu();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !accountMenuRef.current?.open) return;
        event.preventDefault();
        closeMenu();
        accountMenuTriggerRef.current?.focus();
      }}
    >
      <summary
        ref={accountMenuTriggerRef}
        className="account-menu-trigger"
        aria-label={`${text.menu}: ${displayName}`}
        title={displayName}
        onClick={(event) => {
          if (!accountMenuOpenedByHoverRef.current) return;
          event.preventDefault();
          accountMenuOpenedByHoverRef.current = false;
        }}
      >
        <span className="account-avatar" aria-hidden="true">
          {showImage ? (
            <img
              className="account-avatar-image"
              src={accounts.viewer.image ?? undefined}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="account-avatar-fallback">{fallbackInitial}</span>
          )}
        </span>
        <span className="account-menu-trigger-name">{displayName}</span>
      </summary>
      <div className="account-menu" role="group" aria-label={text.account}>
        <div className="account-menu-profile">
          <span>{text.account}</span>
          <strong>{displayName}</strong>
        </div>
        <div className="account-menu-links">
          <Link
            className="account-menu-link"
            to={`/${locale}/account/saved`}
            onClick={handleNavigate}
          >
            {text.saved}
          </Link>
          <Link
            className="account-menu-link"
            to={`/${locale}/account/history`}
            onClick={handleNavigate}
          >
            {text.history}
          </Link>
        </div>
        <button
          className="account-menu-sign-out"
          type="button"
          disabled={signingOut}
          onClick={() => void signOut()}
        >
          {signingOut ? text.signingOut : text.signOut}
        </button>
      </div>
    </details>
  );
}
