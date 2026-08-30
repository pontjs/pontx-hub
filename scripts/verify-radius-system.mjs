import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../app", import.meta.url));
const allowedExtensions = new Set([".css", ".ts", ".tsx"]);
const violations = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else if (allowedExtensions.has(extname(entry.name))) files.push(fullPath);
  }
  return files;
}

for (const file of await walk(appRoot)) {
  const source = await readFile(file, "utf8");

  if (file.endsWith(".css") && !file.endsWith(".test.css")) {
    for (const match of source.matchAll(/border-radius:\s*([^;]+);/g)) {
      if (/\b\d+(?:\.\d+)?(?:px|rem|%)\b/.test(match[1])) {
        violations.push(`${file}: raw border-radius ${match[1].trim()}`);
      }
    }
  }

  if (/rounded-(?:2xl|3xl)|rounded-\[(?:\d|calc\()/g.test(source)) {
    violations.push(`${file}: unsupported Tailwind radius class`);
  }
}

const motionButton = join(appRoot, "components", "motion", "button", "base.tsx");
const motionButtonSource = await readFile(motionButton, "utf8");
const buttonSizes = motionButtonSource.match(/const SIZE_CLASS[\s\S]*?\n};/)?.[0] ?? "";
if (buttonSizes.includes("rounded-full")) {
  violations.push(`${motionButton}: rectangular button size must not use rounded-full`);
}

const motionInput = join(appRoot, "components", "motion", "input.tsx");
if ((await readFile(motionInput, "utf8")).includes("rounded-full")) {
  violations.push(`${motionInput}: rectangular input must not use rounded-full`);
}

const systemCss = await readFile(join(appRoot, "styles", "system.css"), "utf8");
for (const token of [
  "--radius-xs: 2px;",
  "--radius-sm: 4px;",
  "--radius-md: 6px;",
  "--radius-lg: 8px;",
  "--radius-xl: 12px;",
  "--radius-full: 9999px;",
]) {
  if (!systemCss.includes(token)) violations.push(`system.css: missing ${token}`);
}

if (violations.length > 0) {
  console.error("Radius system verification failed:\n" + violations.join("\n"));
  process.exit(1);
}

console.log("Radius system verification passed.");
