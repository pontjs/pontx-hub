import { useEffect, useState } from "react";
import { Link, redirect } from "react-router";
import type { Route } from "./+types/playground-history";
import { AccountWorkspaceShell } from "~/components/account-workspace-shell";
import { MethodBadge } from "~/components/method-badge";
import { loadAccountsViewer } from "~/lib/accounts/viewer.server";
import { ensureProjectsForUser } from "~/lib/accounts/projects.server";
import { listPlaygroundHistoryForUser } from "~/lib/accounts/playground-history.server";
import { getCatalogOperation } from "~/lib/catalog/catalog.server";
import { localize } from "~/lib/catalog/types";
import { requireLocale } from "~/lib/http";
import { storedConfigForPlaygroundHistory } from "~/lib/playground/history-replay";

export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const accounts = await loadAccountsViewer(request);
  if (!accounts.enabled) throw new Response("Not found", { status: 404 });
  if (!accounts.viewer) {
    const path = `/${locale}/account/history`;
    throw redirect(`/${locale}/sign-in?returnTo=${encodeURIComponent(path)}`);
  }
  const projects = await ensureProjectsForUser(accounts.viewer.id, accounts.viewer.name, locale);
  const entries = (
    await listPlaygroundHistoryForUser(accounts.viewer.id, 100)
  ).map((entry) => {
    const match = getCatalogOperation(entry.apiSlug, entry.operationSlug);
    const server = match?.api.servers.find(
      (candidate) => candidate.id === entry.serverId
    );
    return {
      id: entry.id,
      apiSlug: entry.apiSlug,
      operationSlug: entry.operationSlug,
      serverId: entry.serverId,
      pathValues: entry.path,
      queryValues: entry.query,
      headerValues: entry.headers,
      requestBody: entry.requestBody,
      hasRequestBody: entry.hasRequestBody,
      omittedFields: entry.omittedFields,
      responseStatus: entry.responseStatus,
      durationMs: entry.durationMs,
      createdAt: entry.createdAt.toISOString(),
      available: Boolean(match && server),
      apiTitle: match ? localize(match.api.title, locale) : entry.apiSlug,
      provider: match?.api.provider,
      operationTitle: match
        ? localize(match.operation.title, locale)
        : entry.operationSlug,
      method: match?.operation.method,
      pathTemplate: match?.operation.path,
      serverUrl: server?.url
    };
  });
  return {
    locale,
    viewer: accounts.viewer,
    projects: projects.map(({ id, name, isPersonal }) => ({ id, name, isPersonal })),
    entries
  };
}

export function meta({ data }: Route.MetaArgs) {
  const zh = data?.locale !== "en";
  return [
    { title: zh ? "调试历史 — Pontx Hub" : "Playground history — Pontx Hub" },
    {
      name: "description",
      content: zh
        ? "重新打开已保存参数的 API 调试请求。"
        : "Reopen API Playground requests with saved parameters."
    },
    { name: "robots", content: "noindex,nofollow" }
  ];
}

export function headers() {
  return { "Cache-Control": "private, no-store" };
}

type HistoryEntry = Awaited<ReturnType<typeof loader>>["entries"][number];

function HistoryCard({
  entry,
  locale,
  onRemove
}: {
  entry: HistoryEntry;
  locale: "zh" | "en";
  onRemove: (id: string) => void;
}) {
  const zh = locale === "zh";
  const [pending, setPending] = useState<"replay" | "remove">();
  const [error, setError] = useState<string>();
  const fieldCount =
    Object.keys(entry.pathValues).length +
    Object.keys(entry.queryValues).length +
    Object.keys(entry.headerValues).length +
    (entry.hasRequestBody ? 1 : 0);
  const successful = entry.responseStatus >= 200 && entry.responseStatus < 300;
  const createdAt = new Intl.DateTimeFormat(zh ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
    hour12: false
  }).format(new Date(entry.createdAt));

  const replay = () => {
    if (
      !entry.available ||
      !entry.method ||
      !entry.pathTemplate ||
      !entry.serverUrl
    ) {
      return;
    }
    setPending("replay");
    setError(undefined);
    try {
      const configKey = `playground:${entry.method}:${entry.pathTemplate}:params`;
      let auth: unknown;
      try {
        const previous = JSON.parse(window.sessionStorage.getItem(configKey) ?? "{}") as {
          auth?: unknown;
        };
        auth = previous.auth;
      } catch {
        auth = undefined;
      }
      window.sessionStorage.setItem(
        configKey,
        JSON.stringify(
          storedConfigForPlaygroundHistory(
            {
              serverUrl: entry.serverUrl,
              pathValues: entry.pathValues,
              queryValues: entry.queryValues,
              headerValues: entry.headerValues,
              requestBody: entry.requestBody,
              hasRequestBody: entry.hasRequestBody
            },
            auth ? { auth } : undefined
          )
        )
      );
      window.sessionStorage.setItem(
        `playground:spec:${entry.apiSlug}:baseUrl`,
        entry.serverUrl
      );
      window.location.assign(
        `/${locale}/apis/${entry.apiSlug}/${entry.operationSlug}`
      );
    } catch {
      setPending(undefined);
      setError(
        zh
          ? "参数恢复失败，请重试。"
          : "Could not restore these parameters. Try again."
      );
    }
  };

  const remove = async () => {
    setPending("remove");
    setError(undefined);
    try {
      const response = await fetch(
        `/api/account/v1/playground/history/${encodeURIComponent(entry.id)}`,
        { method: "DELETE" }
      );
      if (response.status === 401) {
        const returnTo = encodeURIComponent(`/${locale}/account/history`);
        window.location.assign(`/${locale}/sign-in?returnTo=${returnTo}`);
        return;
      }
      if (!response.ok) throw new Error("history_delete_failed");
      onRemove(entry.id);
    } catch {
      setPending(undefined);
      setError(zh ? "删除失败，请重试。" : "Could not delete this entry. Try again.");
    }
  };

  return (
    <article className="playground-history-card">
      <div className="playground-history-card-main">
        <div className="playground-history-card-topline">
          {entry.method ? (
            <MethodBadge method={entry.method} compact />
          ) : null}
          <code>{entry.pathTemplate ?? entry.operationSlug}</code>
          <span
            className={
              `playground-history-status${successful ? " is-success" : " is-error"}`
            }
            title={zh ? "上次响应状态" : "Previous response status"}
          >
            HTTP {entry.responseStatus}
          </span>
        </div>
        <h2>{entry.operationTitle}</h2>
        <p className="playground-history-api">
          <strong>{entry.apiTitle}</strong>
          {entry.provider ? <span>{entry.provider}</span> : null}
        </p>
        <dl className="playground-history-facts">
          <div>
            <dt>{zh ? "保存参数" : "Saved inputs"}</dt>
            <dd>{fieldCount}</dd>
          </div>
          <div>
            <dt>{zh ? "耗时" : "Duration"}</dt>
            <dd>{entry.durationMs} ms</dd>
          </div>
          <div>
            <dt>{zh ? "时间" : "Time"}</dt>
            <dd><time dateTime={entry.createdAt}>{createdAt} UTC</time></dd>
          </div>
        </dl>
        {entry.omittedFields.length ? (
          <p className="playground-history-omitted">
            {zh ? "为保护隐私，未保存：" : "Not saved for privacy: "}
            <code>{entry.omittedFields.join(", ")}</code>
          </p>
        ) : null}
        {!entry.available ? (
          <p className="playground-history-unavailable">
            {zh
              ? "这个接口或服务器已不在当前目录中，暂时无法重新调试。"
              : "This endpoint or server is no longer available in the current catalog."}
          </p>
        ) : null}
        {error ? <p className="playground-history-error" role="alert">{error}</p> : null}
      </div>
      <div className="playground-history-actions">
        <button
          className="button button-dark"
          type="button"
          disabled={!entry.available || Boolean(pending)}
          onClick={replay}
        >
          {pending === "replay"
            ? (zh ? "正在恢复…" : "Restoring…")
            : (zh ? "重新调试" : "Try again")}
          <span aria-hidden="true">↗</span>
        </button>
        <button
          className="playground-history-remove"
          type="button"
          disabled={Boolean(pending)}
          onClick={() => void remove()}
        >
          {pending === "remove"
            ? (zh ? "删除中…" : "Deleting…")
            : (zh ? "删除记录" : "Delete")}
        </button>
      </div>
    </article>
  );
}

export default function PlaygroundHistory({ loaderData }: Route.ComponentProps) {
  const { locale, viewer, projects } = loaderData;
  const zh = locale === "zh";
  const [entries, setEntries] = useState(loaderData.entries);
  useEffect(() => setEntries(loaderData.entries), [loaderData.entries]);
  return (
    <AccountWorkspaceShell
      locale={locale}
      projects={projects}
      activeProjectId={projects[0]?.id}
      current="history"
      viewer={viewer}
    >
      <main className="playground-history-page">
        <header className="playground-history-header">
          <div>
            <p className="account-eyebrow">PONTX / PLAYGROUND LOG</p>
            <h1>{zh ? "调试历史" : "Playground history"}</h1>
            <p>
              {zh
                ? "再次打开之前的接口与参数，不必从头填写。" +
                  "最近 100 条记录会跨设备同步。"
                : "Reopen an endpoint with its previous inputs instead of " +
                  "starting over. Your latest 100 entries sync across devices."}
            </p>
          </div>
          <aside>
            <strong>{zh ? "凭证不进入历史" : "Credentials stay out"}</strong>
            <p>
              {zh
                ? "API Key、OAuth Token、密码、响应内容和识别为敏感的字段不会保存。" +
                  "重新调试时，凭证仍只使用当前浏览器会话中的值。"
                : "API keys, OAuth tokens, passwords, responses, and detected " +
                  "sensitive fields are never saved. Replays only reuse " +
                  "credentials already in this browser session."}
            </p>
          </aside>
        </header>
        {entries.length ? (
          <section
            className="playground-history-list"
            aria-label={zh ? "最近的调试记录" : "Recent Playground history"}
          >
            {entries.map((entry) => (
              <HistoryCard
                key={entry.id}
                entry={entry}
                locale={locale}
                onRemove={(id) => setEntries(
                  (current) => current.filter((item) => item.id !== id)
                )}
              />
            ))}
          </section>
        ) : (
          <section className="playground-history-empty">
            <span aria-hidden="true">↻</span>
            <div>
              <h2>{zh ? "还没有调试记录" : "No Playground history yet"}</h2>
              <p>
                {zh
                  ? "登录状态下调用任一可在线执行的接口，记录会自动出现在这里。"
                  : "Run any live endpoint while signed in and it will appear here automatically."}
              </p>
              <Link className="button button-dark" to={`/${locale}`}>
                {zh ? "查找 API" : "Find an API"}
              </Link>
            </div>
          </section>
        )}
      </main>
    </AccountWorkspaceShell>
  );
}
