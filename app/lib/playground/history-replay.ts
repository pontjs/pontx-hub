export type PlaygroundHistoryReplay = {
  serverUrl: string;
  pathValues: Record<string, string | number | boolean>;
  queryValues: Record<string, string | number | boolean>;
  headerValues: Record<string, string>;
  requestBody: unknown;
  hasRequestBody: boolean;
};

type StoredPlaygroundConfig = {
  auth?: unknown;
};

function stringValues(
  values: Record<string, string | number | boolean>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [name, String(value)])
  );
}

export function storedConfigForPlaygroundHistory(
  entry: PlaygroundHistoryReplay,
  previous: StoredPlaygroundConfig | undefined,
  timestamp = Date.now()
) {
  return {
    url: entry.serverUrl,
    ...(previous?.auth ? { auth: previous.auth } : {}),
    pathParams: stringValues(entry.pathValues),
    queryParams: stringValues(entry.queryValues),
    headerParams: { ...entry.headerValues },
    ...(entry.hasRequestBody
      ? { requestBody: JSON.stringify(entry.requestBody, null, 2) }
      : {}),
    timestamp
  };
}
