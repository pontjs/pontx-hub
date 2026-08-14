import type { Locale } from "~/lib/catalog/types";

export const DOC_SLUGS = [
  "overview",
  "quick-start",
  "agent-skill",
  "cli",
  "sdk",
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
      "API 文档、Agent Skill、统一 CLI 与统一 SDK",
      "API Documentation, Agent Skill, Universal CLI & Unified SDK"
    ),
    title: text("先从 Agent Skill 开始，再选择你习惯的方式。", "Start with the Agent Skill, then work the way you prefer."),
    description: text(
      "Pontx Hub 文档从 Agent Skill 开始，提供统一 CLI、统一 SDK 与网站指南，涵盖 API 搜索、接口参数、请求预览和代码集成。",
      "Pontx Hub documentation for the Agent Skill, Universal CLI, Unified SDK, and website, covering API discovery, Endpoint details, request preview, and code integration."
    ),
    eyebrow: text("Pontx Hub 文档", "Pontx Hub documentation"),
    keywords: text("首页 概览 API 接口 数据结构 工作流", "home overview API endpoint schema workflow"),
    sections: [
      { id: "choose-interface", title: text("从 Agent Skill 开始", "Start with the Agent Skill") },
      { id: "shared-model", title: text("不同入口，同一份 API 资料", "One source, whichever way you work") },
      { id: "one-workflow", title: text("从找到接口到写进项目", "From finding an API to using it") }
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
      "安装 @pontx/hub-cli，使用 pontx-hub 搜索、查看、预演和调用已收录 API，并通过 JSON 输出编写脚本。",
      "Install @pontx/hub-cli to search, inspect, preview, and call curated APIs with pontx-hub, including JSON output for scripts."
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
    navTitle: text("Agent Skill", "Agent Skill"),
    metaTitle: text(
      "Agent Skill：查找、预演与调用 API",
      "Agent Skill for API Discovery, Preview & Calls"
    ),
    title: text("让 Agent 用一套清楚可靠的步骤来使用 API。", "Give your agent a clear, reliable way to work with APIs."),
    description: text(
      "安装 Pontx Hub Agent Skill，让 Agent 按清楚步骤搜索 API、核对接口参数、预览请求，并在确认后调用接口或准备统一 SDK 代码。",
      "Install the Pontx Hub Agent Skill so an agent can find APIs, check Endpoint parameters, preview requests, and, once confirmed, call an Endpoint or prepare Unified SDK code."
    ),
    eyebrow: text("Agent / 通用 Skill", "Agent / universal Skill"),
    keywords: text("Agent Skill Codex 安装 工作流 安全", "Agent Skill Codex install workflow safety"),
    sections: [
      { id: "install", title: text("安装 Skill", "Install the Skill") },
      { id: "workflow", title: text("一次完整的使用过程", "A complete request") },
      { id: "context", title: text("需要时再读取 API 资料", "Load API details when needed") },
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
    slugs: ["agent-skill", "cli", "sdk", "web"] as DocSlug[]
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
