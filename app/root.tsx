import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration
} from "react-router";
import type { Route } from "./+types/root";
import { PONTX_LOGO_DATA_URL } from "~/lib/brand";
import "./styles/app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/png", href: PONTX_LOGO_DATA_URL },
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
  return (
    <html lang="zh-CN">
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
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let status = 500;
  let title = "The reference slipped out of view.";
  let details = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    status = error.status;
    title = error.status === 404 ? "This endpoint is not in the atlas." : "Request failed.";
    details = error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
  }

  return (
    <main className="error-page">
      <div className="error-code">{status}</div>
      <h1>{title}</h1>
      <p>{details}</p>
      <a className="button button-dark" href="/zh/apis">
        Return to API catalog
      </a>
    </main>
  );
}
