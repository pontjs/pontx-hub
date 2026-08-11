import { useState } from "react";
import { Link, useLocation, useRouteLoaderData } from "react-router";
import type { loader as rootLoader } from "~/root";
import type { Locale } from "~/lib/catalog/types";

const copy = {
  zh: {
    save: "收藏 API",
    saved: "已收藏",
    saving: "保存中…",
    remove: "取消收藏",
    signIn: "登录后收藏",
    error: "收藏状态更新失败，请重试。"
  },
  en: {
    save: "Save API",
    saved: "Saved",
    saving: "Saving…",
    remove: "Remove saved API",
    signIn: "Sign in to save",
    error: "Could not update this saved API. Try again."
  }
} satisfies Record<Locale, Record<string, string>>;

export function FavoriteApiButton({
  apiSlug,
  locale,
  initialFavorite = false,
  compact = false,
  onChange
}: {
  apiSlug: string;
  locale: Locale;
  initialFavorite?: boolean;
  compact?: boolean;
  onChange?: (saved: boolean) => void;
}) {
  const root = useRouteLoaderData<typeof rootLoader>("root");
  const location = useLocation();
  const [saved, setSaved] = useState(initialFavorite);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const accounts = root?.accounts;
  const text = copy[locale];

  if (!accounts?.enabled) return null;

  const className = `favorite-api-control${compact ? " favorite-api-control-compact" : ""}`;
  if (!accounts.viewer) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Link
        className={className}
        to={`/${locale}/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
        aria-label={`${text.signIn}: ${apiSlug}`}
        title={text.signIn}
      >
        <span aria-hidden="true">☆</span>
        {!compact && <span>{text.save}</span>}
      </Link>
    );
  }

  const toggle = async () => {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/account/v1/favorites/apis/${encodeURIComponent(apiSlug)}`,
        { method: saved ? "DELETE" : "PUT" }
      );
      if (response.status === 401) {
        window.location.assign(`/${locale}/sign-in?returnTo=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)}`);
        return;
      }
      if (!response.ok) throw new Error("favorite_failed");
      const next = !saved;
      setSaved(next);
      onChange?.(next);
    } catch {
      setError(text.error);
    } finally {
      setPending(false);
    }
  };

  const label = pending ? text.saving : saved ? text.remove : text.save;
  return (
    <span className="favorite-api-control-wrap">
      <button
        className={className}
        type="button"
        aria-pressed={saved}
        aria-label={`${label}: ${apiSlug}`}
        title={saved ? text.saved : text.save}
        disabled={pending}
        onClick={() => void toggle()}
      >
        <span aria-hidden="true">{saved ? "★" : "☆"}</span>
        {!compact && <span>{pending ? text.saving : saved ? text.saved : text.save}</span>}
      </button>
      {error ? <span className="favorite-api-error" role="alert">{error}</span> : null}
    </span>
  );
}
