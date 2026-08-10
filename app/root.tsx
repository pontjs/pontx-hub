import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation
} from "react-router";
import type { Route } from "./+types/root";
import { GoogleAnalytics } from "~/components/google-analytics";
import { PONTX_LOGO_DATA_URL } from "~/lib/brand";
import { loadAccountsViewer } from "~/lib/accounts/viewer.server";
import "./styles/app.css";
import "./styles/account.css";

const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/i;

export async function loader({ request }: Route.LoaderArgs) {
  const configuredId = process.env.GOOGLE_ANALYTICS_ID?.trim();
  const accounts = await loadAccountsViewer(request);

  return {
    accounts,
    googleAnalyticsId:
      configuredId && GA_MEASUREMENT_ID_PATTERN.test(configuredId) ? configuredId : undefined
  };
}

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: PONTX_LOGO_DATA_URL },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous"
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Literata:opsz,wght@7..72,500;7..72,600;7..72,700&family=Public+Sans:wght@400;500;600;700&display=swap"
  }
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const language = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "zh-CN";

  return (
    <html lang={language}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f5f0e6" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { googleAnalyticsId } = useLoaderData<typeof loader>();

  return (
    <>
      <Outlet />
      <GoogleAnalytics measurementId={googleAnalyticsId} />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { pathname } = useLocation();
  const zh = pathname === "/zh" || pathname.startsWith("/zh/");
  let status = 500;
  let title = zh ? "这个参考页面暂时找不到。" : "The reference slipped out of view.";
  let details = zh ? "发生了意外错误。" : "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    status = error.status;
    title = error.status === 404
      ? zh ? "目录中没有这个页面。" : "This endpoint is not in the atlas."
      : zh ? "请求失败。" : "Request failed.";
    details = error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
  }

  return (
    <main className="error-page">
      <div className="error-code">{status}</div>
      <h1>{title}</h1>
      <p>{details}</p>
      <a className="button button-dark" href={zh ? "/zh" : "/en"}>
        {zh ? "返回 API 目录" : "Return to API catalog"}
      </a>
    </main>
  );
}
