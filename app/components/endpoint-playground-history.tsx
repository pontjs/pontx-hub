import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { Locale } from "~/lib/catalog/types";

export type EndpointPlaygroundHistoryEntry = {
  id: string;
  serverId: string;
  pathValues: Record<string, string | number | boolean>;
  queryValues: Record<string, string | number | boolean>;
  headerValues: Record<string, string>;
  requestBody: unknown;
  hasRequestBody: boolean;
  omittedFields: string[];
  responseStatus: number;
  durationMs: number;
  createdAt: string;
};

type HistoryApiEntry = {
  id: string;
  serverId: string;
  path: Record<string, string | number | boolean>;
  query: Record<string, string | number | boolean>;
  headers: Record<string, string>;
  requestBody: unknown;
  hasRequestBody: boolean;
  omittedFields: string[];
  responseStatus: number;
  durationMs: number;
  createdAt: string;
};

type HistoryResponse = {
  data?: { entries?: HistoryApiEntry[] };
};

function normalizeHistoryEntry(
  entry: HistoryApiEntry
): EndpointPlaygroundHistoryEntry {
  return {
    id: entry.id,
    serverId: entry.serverId,
    pathValues: entry.path,
    queryValues: entry.query,
    headerValues: entry.headers,
    requestBody: entry.requestBody,
    hasRequestBody: entry.hasRequestBody,
    omittedFields: entry.omittedFields,
    responseStatus: entry.responseStatus,
    durationMs: entry.durationMs,
    createdAt: entry.createdAt
  };
}

export function historyInputSummary(
  entry: EndpointPlaygroundHistoryEntry,
  locale: Locale
): string {
  const parameterCount =
    Object.keys(entry.pathValues).length +
    Object.keys(entry.queryValues).length +
    Object.keys(entry.headerValues).length;
  const parts = [
    ...(parameterCount
      ? [locale === "zh" ? `${parameterCount} 个参数` : `${parameterCount} params`]
      : []),
    ...(entry.hasRequestBody ? ["Body"] : [])
  ];
  return parts.join(" + ") || (locale === "zh" ? "无参数" : "No inputs");
}

function formatHistoryTime(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC"
  }).format(new Date(value));
}

export function EndpointPlaygroundHistory({
  locale,
  apiSlug,
  operationSlug,
  availableServerIds,
  initialEntries,
  refreshVersion,
  onReplay
}: {
  locale: Locale;
  apiSlug: string;
  operationSlug: string;
  availableServerIds: string[];
  initialEntries: EndpointPlaygroundHistoryEntry[];
  refreshVersion: number;
  onReplay: (entry: EndpointPlaygroundHistoryEntry) => void;
}) {
  const zh = locale === "zh";
  const [entries, setEntries] = useState(initialEntries);
  const [loadedId, setLoadedId] = useState<string>();
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [replayFailed, setReplayFailed] = useState(false);

  const availableServerKey = availableServerIds.join("\u0000");
  const availableServers = useMemo(
    () => new Set(availableServerIds),
    [availableServerKey]
  );

  useEffect(() => {
    setEntries(
      initialEntries.filter((entry) => availableServers.has(entry.serverId))
    );
  }, [availableServers, initialEntries]);

  useEffect(() => {
    if (!refreshVersion) return;
    const controller = new AbortController();
    const parameters = new URLSearchParams({
      apiSlug,
      operationSlug,
      limit: "3"
    });
    void fetch(`/api/account/v1/playground/history?${parameters}`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("history_refresh_failed");
        return response.json() as Promise<HistoryResponse>;
      })
      .then((payload) => {
        setEntries(
          (payload.data?.entries ?? [])
            .map(normalizeHistoryEntry)
            .filter((entry) => availableServers.has(entry.serverId))
        );
        setRefreshFailed(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRefreshFailed(true);
      });
    return () => controller.abort();
  }, [apiSlug, availableServers, operationSlug, refreshVersion]);

  const replay = (entry: EndpointPlaygroundHistoryEntry) => {
    try {
      onReplay(entry);
      setLoadedId(entry.id);
      setRefreshFailed(false);
      setReplayFailed(false);
    } catch {
      setLoadedId(undefined);
      setReplayFailed(true);
    }
  };

  return (
    <section
      className="endpoint-playground-history"
      aria-labelledby="endpoint-playground-history-title"
    >
      <header>
        <div>
          <p>{zh ? "当前接口 · 最近记录" : "This endpoint · Recent runs"}</p>
          <h2 id="endpoint-playground-history-title">
            {zh ? "调试历史" : "Playground history"}
            <span>{entries.length}</span>
          </h2>
        </div>
        <div className="endpoint-playground-history-header-actions">
          <span>{zh ? "重试会同步参数与代码" : "Retry syncs inputs and code"}</span>
          <Link to={`/${locale}/account/history`}>
            {zh ? "全部历史" : "All history"}<span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      {entries.length ? (
        <ol>
          {entries.map((entry) => {
            const successful =
              entry.responseStatus >= 200 && entry.responseStatus < 300;
            const time = formatHistoryTime(entry.createdAt, locale);
            return (
              <li key={entry.id} data-loaded={loadedId === entry.id || undefined}>
                <span
                  className={
                    `endpoint-history-status${successful ? " is-success" : " is-error"}`
                  }
                >
                  HTTP {entry.responseStatus}
                </span>
                <time dateTime={entry.createdAt}>{time} UTC</time>
                <span className="endpoint-history-inputs">
                  {historyInputSummary(entry, locale)}
                  <small>{entry.durationMs} ms</small>
                  {entry.omittedFields.length ? (
                    <small title={entry.omittedFields.join(", ")}>
                      {zh
                        ? `已跳过 ${entry.omittedFields.length} 个敏感字段`
                        : `${entry.omittedFields.length} sensitive omitted`}
                    </small>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => replay(entry)}
                  title={
                    zh
                      ? "载入参数，不会自动发送请求"
                      : "Load inputs without sending the request"
                  }
                  aria-label={
                    zh
                      ? `使用 ${time} 的参数重试`
                      : `Retry with inputs from ${time}`
                  }
                >
                  {loadedId === entry.id
                    ? (zh ? "已载入" : "Loaded")
                    : (zh ? "重试" : "Retry")}
                  <span aria-hidden="true">→</span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="endpoint-playground-history-empty">
          {zh
            ? "还没有当前接口的记录。完成一次调试后，可在这里直接重试。"
            : "No runs for this endpoint yet. Finish one request to retry it here."}
        </p>
      )}

      {loadedId ? (
        <p className="endpoint-playground-history-feedback" role="status">
          {zh
            ? "历史参数已载入；Playground、SDK 与 CLI 代码已同步，确认后可重新发送。"
            : "History loaded. Playground, SDK, and CLI code are in sync; review before sending."}
        </p>
      ) : replayFailed ? (
        <p className="endpoint-playground-history-feedback is-error" role="alert">
          {zh
            ? "历史参数载入失败，请重试。"
            : "History inputs could not be loaded. Try again."}
        </p>
      ) : refreshFailed ? (
        <p className="endpoint-playground-history-feedback is-error" role="status">
          {zh
            ? "最新记录暂时未刷新，现有记录仍可使用。"
            : "The latest run could not refresh; existing history is still available."}
        </p>
      ) : null}
    </section>
  );
}
