import { useLocation, useNavigation } from "react-router";

export function NavigationProgress() {
  const navigation = useNavigation();
  const { pathname } = useLocation();
  const pending = navigation.state !== "idle";
  const zh = pathname === "/zh" || pathname.startsWith("/zh/");

  return (
    <>
      <div
        className="navigation-progress"
        data-pending={pending || undefined}
        aria-hidden="true"
      >
        <span />
      </div>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {pending ? (zh ? "正在加载页面…" : "Loading page…") : ""}
      </span>
    </>
  );
}
