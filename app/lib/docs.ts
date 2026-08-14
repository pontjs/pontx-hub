import type { Locale } from "~/lib/catalog/types";

export const DOC_SLUGS = [
  "overview",
  "quick-start",
  "web",
  "cli",
  "sdk",
  "agent-skill",
  "safety"
] as const;

export type DocSlug = (typeof DOC_SLUGS)[number];

type LocalizedText = Record<Locale, string>;

export type DocPageDefinition = {
  slug: DocSlug;
  navTitle: LocalizedText;
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
    title: text("从一次搜索，到可靠的 API 集成。", "From first search to a reliable API integration."),
    description: text(
      "用同一套 Pontx 心智模型理解网站、统一 CLI、TypeScript SDK 与 Agent Skill。",
      "Use one Pontx mental model across the website, universal CLI, TypeScript SDKs, and Agent Skill."
    ),
    eyebrow: text("Pontx Hub 文档", "Pontx Hub documentation"),
    keywords: text("首页 概览 API 接口 数据结构 工作流", "home overview API endpoint schema workflow"),
    sections: [
      { id: "choose-interface", title: text("选择你的使用方式", "Choose your interface") },
      { id: "shared-model", title: text("一套共享模型", "One shared model") },
      { id: "one-workflow", title: text("同一条集成路径", "One integration path") }
    ]
  },
  "quick-start": {
    slug: "quick-start",
    navTitle: text("5 分钟快速开始", "5-minute quick start"),
    title: text("用 5 分钟接入一个 API。", "Integrate an API in five minutes."),
    description: text(
      "安装 Pontx Hub CLI，搜索接口、检查 Schema、预演请求，再生成类型安全的 SDK 集成。",
      "Install the Pontx Hub CLI, find an endpoint, inspect its Schema, preview the request, and move to a type-safe SDK."
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
    title: text("在网站中发现、阅读与调试 API。", "Discover, read, and debug APIs on the web."),
    description: text(
      "从全局语义搜索进入 API、接口与数据结构页面，在同一工作区查看文档、请求预演与集成代码。",
      "Move from semantic search into API, Endpoint, and Schema pages, then use one workspace for docs, request preview, and integration code."
    ),
    eyebrow: text("网站 / 无需安装", "Website / no install"),
    keywords: text("网站 搜索 API 目录 接口 数据结构 Playground 调试", "website search catalog endpoint schema playground debug"),
    sections: [
      { id: "search", title: text("从意图开始搜索", "Start with intent") },
      { id: "read", title: text("读懂资源层级", "Read the resource hierarchy") },
      { id: "playground", title: text("在 Playground 中预演", "Preview in the Playground") },
      { id: "return", title: text("把验证结果带回代码", "Bring verified inputs back to code") }
    ]
  },
  cli: {
    slug: "cli",
    navTitle: text("统一 CLI", "Universal CLI"),
    title: text("一个 CLI，覆盖整个 API 目录。", "One CLI for the entire API catalog."),
    description: text(
      "使用 pontx-hub 搜索、查看、预演和调用已收录 API，并以稳定 JSON 输出连接脚本与 Agent。",
      "Use pontx-hub to search, inspect, preview, and call curated APIs, with stable JSON output for scripts and agents."
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
    navTitle: text("TypeScript SDK", "TypeScript SDKs"),
    title: text("统一的 SDK 命名、类型与调用方式。", "Consistent SDK naming, types, and calls."),
    description: text(
      "每个 API 使用 @pontx/<api-slug> 包名、生成类型与独立 CLI，让发现、验证和生产集成保持一致。",
      "Each API uses an @pontx/<api-slug> package, generated types, and a dedicated CLI so discovery, verification, and production integration stay aligned."
    ),
    eyebrow: text("SDK / TypeScript + Node.js", "SDK / TypeScript + Node.js"),
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
    title: text("让 Agent 按需查找，而不是背下全部 API。", "Let agents retrieve APIs on demand, not memorize the catalog."),
    description: text(
      "安装通用 Pontx Hub Skill，让 Agent 通过统一 CLI 搜索、检查、预演并在获得授权后调用 API。",
      "Install the universal Pontx Hub Skill so agents search, inspect, preview, and call APIs through the universal CLI after authorization."
    ),
    eyebrow: text("Agent / 通用 Skill", "Agent / universal Skill"),
    keywords: text("Agent Skill Codex 安装 工作流 安全", "Agent Skill Codex install workflow safety"),
    sections: [
      { id: "install", title: text("安装 Skill", "Install the Skill") },
      { id: "workflow", title: text("Agent 工作流", "Agent workflow") },
      { id: "context", title: text("保持上下文轻量", "Keep context lean") },
      { id: "boundaries", title: text("不可绕过的边界", "Boundaries that cannot be bypassed") }
    ]
  },
  safety: {
    slug: "safety",
    navTitle: text("凭证与安全", "Credentials and safety"),
    title: text("先看清请求，再决定是否发送。", "See the exact request before deciding to send it."),
    description: text(
      "理解 Pontx 的凭证存储、服务端目标限制、预演流程与写操作确认边界。",
      "Understand Pontx credential storage, destination restrictions, preview flow, and mutation confirmation boundaries."
    ),
    eyebrow: text("安全模型 / Preview first", "Safety model / preview first"),
    keywords: text("安全 凭证 环境变量 sessionStorage 预演 写操作 确认 SSRF", "security credentials environment sessionStorage preview mutation confirmation SSRF"),
    sections: [
      { id: "credentials", title: text("凭证留在调用者一侧", "Credentials stay with the caller") },
      { id: "preview", title: text("预演是固定步骤", "Preview is a fixed step") },
      { id: "mutations", title: text("写操作需要精确确认", "Mutations require exact confirmation") },
      { id: "network", title: text("只访问目录批准的目标", "Only catalog-approved destinations") }
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
    slugs: ["web", "cli", "sdk", "agent-skill"] as DocSlug[]
  },
  {
    label: text("原则", "Principles"),
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
