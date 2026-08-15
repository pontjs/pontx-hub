import { execFileSync, spawnSync } from "node:child_process";
import { userInfo } from "node:os";

const PRODUCTION_ORIGIN = "https://pontx.dev";
const KEYCHAIN_SERVICE = "pontx-agent-browser-state";
const ENCRYPTION_KEY_PATTERN = /^[a-f0-9]{64}$/i;
const SESSION_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/i;

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
const encryptionKey = requireEncryptionKey();
const result = spawnSync("agent-browser", [
  "--session",
  session,
  "--session-name",
  `pontx-internal-${session}`,
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
process.exit(result.status ?? 1);
