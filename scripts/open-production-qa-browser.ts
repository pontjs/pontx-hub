import { execFileSync, spawnSync } from "node:child_process";
import { userInfo } from "node:os";

const PRODUCTION_ORIGIN = "https://pontx.dev";
const KEYCHAIN_SERVICE = "pontx-agent-browser-state";
const ENCRYPTION_KEY_PATTERN = /^[a-f0-9]{64}$/i;
const SESSION_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const MINIMUM_AGENT_BROWSER_VERSION = [0, 26, 0] as const;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function requireEncryptionKey(): string {
  const configured = process.env.AGENT_BROWSER_ENCRYPTION_KEY?.trim();
  if (configured) {
    if (!ENCRYPTION_KEY_PATTERN.test(configured)) {
      throw new Error("AGENT_BROWSER_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters.");
    }
    return configured;
  }

  if (process.platform === "darwin") {
    try {
      const stored = execFileSync("security", [
        "find-generic-password",
        "-w",
        "-s",
        KEYCHAIN_SERVICE,
        "-a",
        userInfo().username
      ], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      if (ENCRYPTION_KEY_PATTERN.test(stored)) return stored;
    } catch {
      // Fall through to the actionable setup error below.
    }
  }

  throw new Error(
    `No encrypted Agent Browser state key is configured. Set AGENT_BROWSER_ENCRYPTION_KEY or store a 64-character hexadecimal key in macOS Keychain service ${KEYCHAIN_SERVICE}.`
  );
}

function requireSupportedAgentBrowser() {
  let output: string;
  try {
    output = execFileSync("agent-browser", ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    throw new Error("agent-browser is required. Install it with `pnpm add -g agent-browser@latest`.");
  }

  const match = output.match(/\b(\d+)\.(\d+)\.(\d+)\b/);
  if (!match) throw new Error(`Could not parse the agent-browser version from: ${output}`);

  const installed = match.slice(1).map(Number);
  let comparison = 0;
  for (const [index, part] of installed.entries()) {
    const minimum = MINIMUM_AGENT_BROWSER_VERSION[index];
    if (part === minimum) continue;
    comparison = part > minimum ? 1 : -1;
    break;
  }

  if (comparison < 0) {
    throw new Error(
      `agent-browser >=${MINIMUM_AGENT_BROWSER_VERSION.join(".")} is required because older releases do not restore Local Storage. Run \`pnpm add -g agent-browser@latest\`.`
    );
  }
}

function productionUrl(path: string): string {
  if (!path.startsWith("/")) throw new Error("--path must begin with '/'.");
  const url = new URL(path, PRODUCTION_ORIGIN);
  if (url.origin !== PRODUCTION_ORIGIN) throw new Error("--path must stay on https://pontx.dev.");
  url.searchParams.set("pontx_internal", "1");
  return url.toString();
}

const session = option("--session");
const path = option("--path");

if (!session || !SESSION_PATTERN.test(session)) {
  throw new Error("--session is required and may contain letters, numbers, '.', '_' and '-'.");
}
if (!path) throw new Error("--path is required.");

const url = productionUrl(path);
requireSupportedAgentBrowser();
const encryptionKey = requireEncryptionKey();
const sessionName = `pontx-internal-${session}`;
const result = spawnSync("agent-browser", [
  "--session",
  session,
  "--session-name",
  sessionName,
  "open",
  url
], {
  env: {
    ...process.env,
    AGENT_BROWSER_ENCRYPTION_KEY: encryptionKey
  },
  stdio: "inherit"
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const marker = spawnSync("agent-browser", [
  "--session",
  session,
  "--session-name",
  sessionName,
  "storage",
  "local",
  "get",
  "pontx.analytics.traffic_type"
], {
  env: {
    ...process.env,
    AGENT_BROWSER_ENCRYPTION_KEY: encryptionKey
  },
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

if (marker.error) throw marker.error;
if (marker.status !== 0 || !marker.stdout.split("\n").some((line) => line.trim().endsWith(": internal"))) {
  throw new Error("The production page opened, but the internal analytics marker was not persisted.");
}

console.log(`✓ Internal analytics marker persisted for Agent Browser session ${session}.`);
