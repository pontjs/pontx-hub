import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
  useRouteLoaderData
} from "react-router";
import type { Route } from "./+types/root";
import { GoogleAnalytics } from "~/components/google-analytics";
import { NavigationProgress } from "~/components/navigation-progress";
import { PONTX_LOGO_DATA_URL } from "~/lib/brand";
import { AccountProvider } from "~/lib/accounts/account-context";
import { readAccountsConfiguration } from "~/lib/accounts/config.server";
import "./styles/app.css";
import "./styles/account.css";
import "./styles/system.css";

const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/i;

export async function loader() {
  const configuredId = process.env.GOOGLE_ANALYTICS_ID?.trim();
  const accountsEnabled = readAccountsConfiguration().status === "ready";

  return {
    accountsEnabled,
    siteVerification: {
      google: process.env.GOOGLE_SITE_VERIFICATION?.trim(),
      bing: process.env.BING_SITE_VERIFICATION?.trim(),
      baidu: process.env.BAIDU_SITE_VERIFICATION?.trim()
    },
    googleAnalyticsId:
      configuredId && GA_MEASUREMENT_ID_PATTERN.test(configuredId) ? configuredId : undefined
  };
}

// Deployment configuration is immutable for the lifetime of a client bundle.
// Re-reading it on every documentation navigation only adds a serial route-data request.
export function shouldRevalidate() {
  return false;
}

export function siteVerificationMeta(data: Awaited<ReturnType<typeof loader>>["siteVerification"] | undefined) {
  return [
    ...(data?.google ? [{ name: "google-site-verification", content: data.google }] : []),
    ...(data?.bing ? [{ name: "msvalidate.01", content: data.bing }] : []),
    ...(data?.baidu ? [{ name: "baidu-site-verification", content: data.baidu }] : [])
  ];
}

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: PONTX_LOGO_DATA_URL },
  { rel: "api-catalog", type: "application/linkset+json", href: "/.well-known/api-catalog" },
  { rel: "service-desc", type: "application/vnd.oai.openapi+json", href: "/openapi.json" },
  { rel: "describedby", type: "application/json", href: "/.well-known/agent-skills/index.json" },
  { rel: "alternate", type: "text/plain", href: "/llms.txt", title: "LLM documentation index" }
];

type RootLoaderData = Awaited<ReturnType<typeof loader>>;

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  // Layout renders for every matched route and also on error paths where the
  // root loader data is not present; read it defensively through the route id.
  const rootData = useRouteLoaderData("root") as RootLoaderData | undefined;
  const siteVerification = rootData?.siteVerification;
  const language = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "zh-CN";

  return (
    <html lang={language}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f4f7fb" />
        {siteVerificationMeta(siteVerification).map(({ name, content }) => (
          <meta key={name} name={name} content={content} />
        ))}
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
  const rootData = useRouteLoaderData("root") as RootLoaderData | undefined;
  const accountsEnabled = rootData?.accountsEnabled ?? false;
  const googleAnalyticsId = rootData?.googleAnalyticsId;

  return (
    <>
      <NavigationProgress />
      <AccountProvider initialState={{
        enabled: accountsEnabled,
        loaded: true,
        viewer: null,
        favorites: []
      }}><Outlet /></AccountProvider>
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
    <main className="error-page" data-pontx-ui="hub">
      <div className="error-code">{status}</div>
      <h1>{title}</h1>
      <p>{details}</p>
      <a className="button button-dark" href={zh ? "/zh" : "/en"}>
        {zh ? "返回 API 目录" : "Return to API catalog"}
      </a>
    </main>
  );
}
