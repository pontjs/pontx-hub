import type { Locale } from "~/lib/catalog/types";

export const DOC_SLUGS = [
  "overview",
  "quick-start",
  "cli",
  "sdk",
  "agent-skill",
  "web",
  "safety"
] as const;

export type DocSlug = (typeof DOC_SLUGS)[number];

type LocalizedText = Record<Locale, string>;

export type DocPageDefinition = {
  slug: DocSlug;
  navTitle: LocalizedText;
  metaTitle: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  eyebrow: LocalizedText;
  keywords: LocalizedText;
  sections: Array<{
    id: string;
    title: LocalizedText;
  }>;
};

const text = (zh: string, en: string): LocalizedText => ({ zh, en });

const pages: Record<DocSlug, DocPageDefinition> = {
  overview: {
    slug: "overview",
    navTitle: text("文档首页", "Documentation home"),
    metaTitle: text(
      "API 文档、统一 SDK、统一 CLI 与 Agent Skills",
      "API Documentation, Unified SDK, Universal CLI & Agent Skills"
    ),
    title: text("每个被收录的 API，都有一致的 SDK 与 CLI 调用方式。", "Every curated API comes with a consistent SDK and CLI call model."),
    description: text(
      "pontx-hub 统一搜索、查看和预览整个目录，并执行获准的在线调用；应用集成使用 @pontx/<api> SDK，单 API 脚本使用同包发布的 pontx-<api> CLI。",
      "pontx-hub searches, inspects, and previews the entire catalog and runs approved online calls; applications use @pontx/<api> SDKs, while API-specific scripts use the bundled pontx-<api> CLI."
    ),
    eyebrow: text("统一调用 / SDK + CLI", "Consistent calls / SDK + CLI"),
    keywords: text("首页 概览 API 统一 SDK CLI pontx-hub 接口 数据结构", "home overview API unified SDK CLI pontx-hub endpoint schema"),
    sections: [
      { id: "consistent-access", title: text("先认识统一 SDK 与 CLI", "Start with the Unified SDK and CLI") },
      { id: "shared-model", title: text("不同入口，同一份 API 资料", "One source, whichever way you work") },
      { id: "one-workflow", title: text("一份 API 定义，三种调用入口", "One API definition, three call surfaces") }
    ]
  },
  "quick-start": {
    slug: "quick-start",
    navTitle: text("5 分钟快速开始", "5-minute quick start"),
    metaTitle: text(
      "API 快速开始：搜索、预演与 SDK 集成",
      "API Quick Start: Search, Preview & SDK Integration"
    ),
    title: text("用 5 分钟接入一个 API。", "Integrate an API in five minutes."),
    description: text(
      "5 分钟完成 Pontx Hub CLI 安装、API 搜索、接口参数检查、请求预览和统一 SDK 集成。",
      "Install the Pontx Hub CLI, find an API, inspect Endpoint parameters, preview the request, and begin a Unified SDK integration in five minutes."
    ),
    eyebrow: text("快速开始 / 约 5 分钟", "Quick start / about 5 minutes"),
    keywords: text("安装 搜索 show preview call sdk 入门", "install search show preview call sdk getting started"),
    sections: [
      { id: "install", title: text("安装统一 CLI", "Install the universal CLI") },
      { id: "discover", title: text("搜索并检查", "Search and inspect") },
      { id: "preview", title: text("预演再调用", "Preview, then call") },
      { id: "integrate", title: text("进入 SDK 集成", "Move into an SDK integration") }
    ]
  },
  web: {
    slug: "web",
    navTitle: text("网站使用", "Use the website"),
    metaTitle: text(
      "API 目录与 Playground 使用指南",
      "API Catalog & Playground Guide"
    ),
    title: text("在网站上找到需要的 API，并放心试一次。", "Find the API you need and try it with confidence."),
    description: text(
      "使用 Pontx Hub API 目录搜索能力，查看 Endpoint 文档与 Schema，在 Playground 预览请求，再复制统一 CLI 或统一 SDK 示例。",
      "Search the Pontx Hub API catalog, read Endpoint documentation and Schemas, preview requests in the Playground, and copy Universal CLI or Unified SDK examples."
    ),
    eyebrow: text("网站使用 / 打开就能用", "Website guide / ready in your browser"),
    keywords: text("网站 搜索 API 目录 接口 数据结构 Playground 调试", "website search catalog endpoint schema playground debug"),
    sections: [
      { id: "search", title: text("先搜你想做的事", "Search for what you need") },
      { id: "read", title: text("先看概览，再看接口", "Start with the overview") },
      { id: "playground", title: text("先预览，再决定是否发送", "Preview before you send") },
      { id: "return", title: text("把可用示例带回项目", "Take a working example back to your project") }
    ]
  },
  cli: {
    slug: "cli",
    navTitle: text("统一 CLI", "Universal CLI"),
    metaTitle: text(
      "统一 CLI：搜索、预演与调用 API",
      "Universal CLI for API Search, Preview & Calls"
    ),
    title: text("一个 CLI，覆盖整个 API 目录。", "One CLI for the entire API catalog."),
    description: text(
      "安装 @pontx/hub-cli，搜索、查看和预演全部已收录 API，并调用允许在线执行的接口；编写脚本时可直接读取 JSON 输出。",
      "Install @pontx/hub-cli to search, inspect, and preview every curated API and call Endpoints enabled for online execution, with JSON output for automation."
    ),
    eyebrow: text("CLI / @pontx/hub-cli", "CLI / @pontx/hub-cli"),
    keywords: text("CLI 命令行 list search show preview call sdk json 参数", "CLI command list search show preview call sdk json parameters"),
    sections: [
      { id: "install", title: text("安装与环境", "Install and configure") },
      { id: "commands", title: text("命令地图", "Command map") },
      { id: "discovery", title: text("搜索与检查", "Search and inspect") },
      { id: "requests", title: text("构造请求", "Build a request") },
      { id: "automation", title: text("脚本与自动化", "Scripts and automation") }
    ]
  },
  sdk: {
    slug: "sdk",
    navTitle: text("统一 SDK", "Unified SDK"),
    metaTitle: text(
      "TypeScript SDK：类型安全的 API 客户端",
      "TypeScript SDK: Type-Safe API Clients"
    ),
    title: text("TypeScript SDK：统一的命名、类型与调用方式。", "TypeScript SDK: consistent naming, types, and calls."),
    description: text(
      "了解统一 SDK 当前的 TypeScript 版本：每个 API 使用 @pontx/<api-slug> 包名，并提供生成类型、统一客户端和独立 CLI。",
      "Explore the current TypeScript release of the Unified SDK, with @pontx/<api-slug> packages, generated types, consistent clients, and dedicated CLIs."
    ),
    eyebrow: text("统一 SDK / 当前语言：TypeScript", "Unified SDK / Current language: TypeScript"),
    keywords: text("SDK TypeScript Node ESM CommonJS 类型 包名 独立 CLI", "SDK TypeScript Node ESM CommonJS types package dedicated CLI"),
    sections: [
      { id: "contract", title: text("统一包契约", "The shared package contract") },
      { id: "client-shapes", title: text("按认证方式选择客户端", "Client shapes follow authentication") },
      { id: "dedicated-cli", title: text("独立 API CLI", "Dedicated API CLIs") },
      { id: "versions", title: text("版本与发布边界", "Versions and release boundaries") }
    ]
  },
  "agent-skill": {
    slug: "agent-skill",
    navTitle: text("Agent Skills", "Agent Skills"),
    metaTitle: text(
      "Agent Skills：统一发现与产品集成",
      "Agent Skills for Universal Discovery & Product Integration"
    ),
    title: text("让 Agent 结合统一 Skill 与产品 Skill 使用 API。", "Combine universal and product Skills to work with APIs."),
    description: text(
      "统一 pontx-hub Skill 负责跨目录发现、检查与安全调用；产品 Skill 补充提供商特有的集成流程、最佳实践和注意事项。",
      "The universal pontx-hub Skill handles catalog-wide discovery, inspection, and safe calls; product Skills add provider-specific integration flows, best practices, and caveats."
    ),
    eyebrow: text("Agent / 统一 + 产品 Skills", "Agent / universal + product Skills"),
    keywords: text("Agent Skills Codex 产品 Skill 安装 工作流 安全", "Agent Skills Codex product Skill install workflow safety"),
    sections: [
      { id: "install", title: text("安装统一或产品 Skill", "Install a universal or product Skill") },
      { id: "workflow", title: text("统一发现，产品指引", "Universal discovery, product guidance") },
      { id: "context", title: text("两层 Skill，一份 PontxSpec", "Two Skill layers, one PontxSpec") },
      { id: "boundaries", title: text("不可绕过的边界", "Boundaries that cannot be bypassed") }
    ]
  },
  safety: {
    slug: "safety",
    navTitle: text("凭证与安全", "Credentials and safety"),
    metaTitle: text(
      "API 凭证、请求预览与安全确认",
      "API Credentials, Request Preview & Safety"
    ),
    title: text("先看清请求，再决定是否发送。", "See the exact request before deciding to send it."),
    description: text(
      "了解 Pontx Hub 如何处理 API 凭证、请求预览与写操作确认：网站凭证只留在当前会话，CLI 与 SDK 凭证留在本机环境。",
      "Learn how Pontx Hub handles API credentials, request previews, and mutation confirmation: website credentials stay in the session, while CLI and SDK credentials stay local."
    ),
    eyebrow: text("发送请求前 / Preview first", "Before you send / preview first"),
    keywords: text("安全 凭证 环境变量 sessionStorage 预演 写操作 确认 SSRF", "security credentials environment sessionStorage preview mutation confirmation SSRF"),
    sections: [
      { id: "credentials", title: text("凭证放在哪里", "Where credentials stay") },
      { id: "preview", title: text("先预览完整请求", "Review the request first") },
      { id: "mutations", title: text("修改数据前再确认一次", "Confirm before changing data") },
      { id: "network", title: text("只连接目录里的 API", "Only connect to listed APIs") }
    ]
  }
};

export const DOC_GROUPS = [
  {
    label: text("开始使用", "Get started"),
    slugs: ["overview", "quick-start"] as DocSlug[]
  },
  {
    label: text("使用方式", "Interfaces"),
    slugs: ["cli", "sdk", "agent-skill", "web"] as DocSlug[]
  },
  {
    label: text("使用须知", "Before you send"),
    slugs: ["safety"] as DocSlug[]
  }
] as const;

export function isDocSlug(value: string | undefined): value is DocSlug {
  return DOC_SLUGS.includes(value as DocSlug);
}

export function getDocPage(slug: DocSlug): DocPageDefinition {
  return pages[slug];
}

export function docHref(locale: Locale, slug: DocSlug): string {
  return slug === "overview" ? `/${locale}/docs` : `/${locale}/docs/${slug}`;
}

export function adjacentDocs(slug: DocSlug): {
  previous?: DocPageDefinition;
  next?: DocPageDefinition;
} {
  const index = DOC_SLUGS.indexOf(slug);
  return {
    previous: index > 0 ? pages[DOC_SLUGS[index - 1]] : undefined,
    next: index < DOC_SLUGS.length - 1 ? pages[DOC_SLUGS[index + 1]] : undefined
  };
}
