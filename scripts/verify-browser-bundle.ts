import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const clientBuildDirectory = path.resolve("build/client");
const bareRequirePattern = /(?<![.\w$])require\s*\(/;
const siteShellRawBudget = 32 * 1024;
const siteShellGzipBudget = 12 * 1024;
const apiWorkspaceRawBudget = 64 * 1024;
const apiWorkspaceGzipBudget = 24 * 1024;
const deferredChunkPrefixes = [
  "ai-assistant-",
  "auth-client-",
  "deferred-schema-viewer-",
  "feedback-dialog-",
  "global-search-results-",
  "App-"
];

async function listJavaScriptFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return listJavaScriptFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith(".js") ? [entryPath] : [];
    })
  );

  return files.flat();
}

const files = await listJavaScriptFiles(clientBuildDirectory);
const incompatibleFiles: string[] = [];

for (const file of files) {
  const source = await readFile(file, "utf8");

  if (bareRequirePattern.test(source)) {
    incompatibleFiles.push(path.relative(process.cwd(), file));
  }
}

if (incompatibleFiles.length > 0) {
  throw new Error(
    `Browser bundle contains bare CommonJS require() calls:\n${incompatibleFiles.join("\n")}`
  );
}

const siteShellFiles = files.filter((file) =>
  path.basename(file).startsWith("site-shell-")
);

if (siteShellFiles.length !== 1) {
  throw new Error(
    `Expected exactly one site-shell browser chunk, found ${siteShellFiles.length}`
  );
}

const siteShell = await readFile(siteShellFiles[0]);
const siteShellGzipSize = gzipSync(siteShell).byteLength;

if (siteShell.byteLength > siteShellRawBudget) {
  throw new Error(
    `Site shell is ${siteShell.byteLength} bytes, exceeding the ${siteShellRawBudget}-byte raw budget`
  );
}

if (siteShellGzipSize > siteShellGzipBudget) {
  throw new Error(
    `Site shell is ${siteShellGzipSize} gzip bytes, exceeding the ${siteShellGzipBudget}-byte gzip budget`
  );
}

const apiWorkspaceFiles = files.filter((file) =>
  path.basename(file).startsWith("pontx-api-workspace-")
);

if (apiWorkspaceFiles.length !== 1) {
  throw new Error(
    `Expected exactly one API workspace browser chunk, found ${apiWorkspaceFiles.length}`
  );
}

const apiWorkspace = await readFile(apiWorkspaceFiles[0]);
const apiWorkspaceGzipSize = gzipSync(apiWorkspace).byteLength;

if (apiWorkspace.byteLength > apiWorkspaceRawBudget) {
  throw new Error(
    `API workspace is ${apiWorkspace.byteLength} bytes, exceeding the ${apiWorkspaceRawBudget}-byte raw budget`
  );
}

if (apiWorkspaceGzipSize > apiWorkspaceGzipBudget) {
  throw new Error(
    `API workspace is ${apiWorkspaceGzipSize} gzip bytes, exceeding the ${apiWorkspaceGzipBudget}-byte gzip budget`
  );
}

const missingDeferredChunks = deferredChunkPrefixes.filter((prefix) =>
  !files.some((file) => path.basename(file).startsWith(prefix))
);

if (missingDeferredChunks.length > 0) {
  throw new Error(
    `Expected deferred browser chunks are missing: ${missingDeferredChunks.join(", ")}`
  );
}

console.log(
  `Verified ${files.length} browser chunks: no bare CommonJS require() calls; ` +
  `site shell ${siteShell.byteLength} raw/${siteShellGzipSize} gzip bytes; ` +
  `API workspace ${apiWorkspace.byteLength} raw/${apiWorkspaceGzipSize} gzip bytes; ` +
  "interactive docs, Schema viewer, Agent, auth, feedback, and search remain deferred."
);
