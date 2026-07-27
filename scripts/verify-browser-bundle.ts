import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const clientBuildDirectory = path.resolve("build/client");
const bareRequirePattern = /(?<![.\w$])require\s*\(/;

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

console.log(`Verified ${files.length} browser chunks: no bare CommonJS require() calls.`);
