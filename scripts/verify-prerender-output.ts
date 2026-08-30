import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  listPublicPrerenderPaths,
  listStaticResourcePrerenderPaths
} from "./public-prerender-paths";

const clientDirectory = path.resolve("build/client");
const pagePaths = listPublicPrerenderPaths();
const resourcePaths = listStaticResourcePrerenderPaths();

function outputPath(publicPath: string, suffix: string): string {
  return path.join(clientDirectory, `${publicPath.replace(/^\//, "")}${suffix}`);
}

const missing: string[] = [];
let pageBytes = 0;
let dataBytes = 0;

for (const publicPath of pagePaths) {
  const htmlFile = outputPath(publicPath, "/index.html");
  const dataFile = outputPath(publicPath, ".data");
  if (!existsSync(htmlFile)) missing.push(htmlFile);
  else pageBytes += statSync(htmlFile).size;
  if (!existsSync(dataFile)) missing.push(dataFile);
  else dataBytes += statSync(dataFile).size;
}

for (const resourcePath of resourcePaths) {
  const resourceFile = outputPath(resourcePath, "");
  if (!existsSync(resourceFile)) missing.push(resourceFile);
  else JSON.parse(readFileSync(resourceFile, "utf8"));
}

if (missing.length) {
  throw new Error(
    `Prerender output is incomplete (${missing.length} missing):\n${missing.slice(0, 20).join("\n")}`
  );
}

const endpointPath = pagePaths.find((publicPath) =>
  /^\/en\/apis\/[^/]+\/(?!schemas\/)[^/]+$/.test(publicPath)
);
const schemaPath = pagePaths.find((publicPath) => publicPath.includes("/en/apis/") && publicPath.includes("/schemas/"));

for (const samplePath of [endpointPath, schemaPath]) {
  if (!samplePath) throw new Error("Prerender verification could not select a public reference sample");
  const html = readFileSync(outputPath(samplePath, "/index.html"), "utf8");
  if (!html.includes("<h1") || !html.includes(`rel=\"canonical\" href=\"https://pontx.dev${samplePath}\"`)) {
    throw new Error(`${samplePath} is missing its semantic H1 or exact canonical URL`);
  }
  if (/rel="modulepreload" href="\/assets\/App-[^"]+\.js"/.test(html)) {
    throw new Error(`${samplePath} preloads the interactive documentation/Monaco bundle`);
  }
}

console.log(
  `Verified ${pagePaths.length.toLocaleString()} static HTML pages and data files ` +
  `(${(pageBytes / 1024 / 1024).toFixed(1)} MiB HTML, ${(dataBytes / 1024 / 1024).toFixed(1)} MiB route data), ` +
  `plus ${resourcePaths.length} CDN directory resources.`
);
