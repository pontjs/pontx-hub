import { Link } from "react-router";
import type { Locale } from "~/lib/catalog/types";

export function AccountSectionNavigation({
  locale,
  current
}: {
  locale: Locale;
  current: "projects" | "saved" | "history";
}) {
  const zh = locale === "zh";
  return (
    <nav
      className="account-section-nav"
      aria-label={zh ? "账户内容" : "Account content"}
    >
      <Link
        to={`/${locale}/account/projects`}
        aria-current={current === "projects" ? "page" : undefined}
      >
        {zh ? "我的项目" : "My projects"}
      </Link>
      <Link
        to={`/${locale}/account/saved`}
        aria-current={current === "saved" ? "page" : undefined}
      >
        {zh ? "收藏的接口" : "Saved Endpoints"}
      </Link>
      <Link
        to={`/${locale}/account/history`}
        aria-current={current === "history" ? "page" : undefined}
      >
        {zh ? "调试历史" : "Playground history"}
      </Link>
    </nav>
  );
}
