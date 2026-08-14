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
  metaTitle?: LocalizedText;
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
    title: text("先从 Agent Skill 开始，再选择你习惯的方式。", "Start with the Agent Skill, then work the way you prefer."),
    description: text(
      "让 Agent 帮忙时安装 Skill；喜欢命令行就用统一 CLI，写应用时用统一 SDK，想先看看则直接打开网站。",
      "Install the Skill when you want an agent to help, use the Universal CLI in the terminal, choose the Unified SDK for application code, or simply browse the website."
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
    title: text("在网站上找到需要的 API，并放心试一次。", "Find the API you need and try it with confidence."),
    description: text(
      "先搜索你要完成的事，再查看接口参数、填入示例、确认请求；试通后可以直接复制 CLI 或统一 SDK 代码。",
      "Search for what you need, review the Endpoint, fill in an example, and inspect the request before copying CLI or Unified SDK code."
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
    title: text("一个 CLI，覆盖整个 API 目录。", "One CLI for the entire API catalog."),
    description: text(
      "使用 pontx-hub 搜索、查看、预演和调用已收录 API；需要编写脚本时，可以直接读取 JSON 输出。",
      "Use pontx-hub to search, inspect, preview, and call curated APIs, with JSON output when you need to automate a task."
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
    metaTitle: text("TypeScript SDK", "TypeScript SDK"),
    title: text("TypeScript SDK：统一的命名、类型与调用方式。", "TypeScript SDK: consistent naming, types, and calls."),
    description: text(
      "当前 Pontx SDK 以 TypeScript 发布；每个 API 使用 @pontx/<api-slug> 包名、生成类型与独立 CLI。",
      "Pontx SDKs currently ship for TypeScript; each API uses an @pontx/<api-slug> package, generated types, and a dedicated CLI."
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
    title: text("让 Agent 用一套清楚可靠的步骤来使用 API。", "Give your agent a clear, reliable way to work with APIs."),
    description: text(
      "安装 Pontx Hub Skill 后，你可以让 Agent 帮你查找 API、核对参数、预览请求，并在得到确认后调用接口或准备集成代码。",
      "After installing the Pontx Hub Skill, your agent can find APIs, check parameters, preview requests, and—once confirmed—call an Endpoint or prepare integration code."
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
    title: text("先看清请求，再决定是否发送。", "See the exact request before deciding to send it."),
    description: text(
      "网站不会替你发送请求；凭证只在当前会话或本机环境中使用，可能修改数据的操作还需要再次确认。",
      "Pontx never sends a request for you. Credentials stay in the current session or your local environment, and changes to data require another confirmation."
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
