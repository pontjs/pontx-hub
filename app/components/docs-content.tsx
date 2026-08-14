import { useState } from "react";
import { Link } from "react-router";
import { CodeBlock } from "~/components/code-block";
import type { Locale } from "~/lib/catalog/types";
import { docHref, type DocSlug } from "~/lib/docs";

type CodeExample = {
  id: string;
  label: string;
  language: "shell" | "typescript";
  code: string;
};

function CopyableCode({
  locale,
  code,
  language,
  label,
  className
}: {
  locale: Locale;
  code: string;
  language: CodeExample["language"];
  label: string;
  className?: string;
}) {
  const zh = locale === "zh";
  return (
    <CodeBlock
      className={["docs-code-frame", className].filter(Boolean).join(" ")}
      code={code}
      language={language}
      label={label}
      copyLabel={zh ? "复制" : "Copy"}
      copiedLabel={zh ? "已复制" : "Copied"}
      copyFailedLabel={zh ? "复制失败" : "Copy failed"}
    />
  );
}

function CodeTabs({
  locale,
  label,
  examples
}: {
  locale: Locale;
  label: string;
  examples: CodeExample[];
}) {
  const [active, setActive] = useState(examples[0]?.id ?? "");
  const selected = examples.find((example) => example.id === active) ?? examples[0];
  if (!selected) return null;

  function selectTab(nextIndex: number) {
    const next = examples[(nextIndex + examples.length) % examples.length];
    if (!next) return;
    setActive(next.id);
    window.requestAnimationFrame(() => document.getElementById(`tab-${next.id}`)?.focus());
  }

  return (
    <div className="docs-code-tabs">
      <div className="docs-code-tabs-bar" role="tablist" aria-label={label}>
        {examples.map((example) => (
          <button
            key={example.id}
            type="button"
            id={`tab-${example.id}`}
            role="tab"
            aria-selected={example.id === selected.id}
            aria-controls={`panel-${example.id}`}
            tabIndex={example.id === selected.id ? 0 : -1}
            onClick={() => setActive(example.id)}
            onKeyDown={(event) => {
              const index = examples.indexOf(example);
              if (event.key === "ArrowRight") {
                event.preventDefault();
                selectTab(index + 1);
              } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                selectTab(index - 1);
              } else if (event.key === "Home") {
                event.preventDefault();
                selectTab(0);
              } else if (event.key === "End") {
                event.preventDefault();
                selectTab(examples.length - 1);
              }
            }}
          >
            {example.label}
          </button>
        ))}
      </div>
      {examples.map((example) => (
        <div
          key={example.id}
          id={`panel-${example.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${example.id}`}
          hidden={example.id !== selected.id}
        >
          <CopyableCode
            locale={locale}
            code={example.code}
            language={example.language}
            label={example.label}
          />
        </div>
      ))}
    </div>
  );
}

function DocSection({
  id,
  marker,
  title,
  lead,
  children
}: {
  id: string;
  marker: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="docs-section">
      <div className="docs-section-heading">
        <span>{marker}</span>
        <div>
          <h2>{title}</h2>
          {lead ? <p>{lead}</p> : null}
        </div>
      </div>
      <div className="docs-section-body">{children}</div>
    </section>
  );
}

function Callout({
  tone = "note",
  title,
  children
}: {
  tone?: "note" | "safe" | "warning";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <aside className={`docs-callout docs-callout-${tone}`}>
      <span aria-hidden="true">{tone === "safe" ? "✓" : tone === "warning" ? "!" : "i"}</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </aside>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="docs-inline-code">{children}</code>;
}

function Overview({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const interfaces = [
    {
      number: "01",
      title: "Agent Skill",
      description: zh ? "告诉 Agent 你想做什么，它会按固定步骤帮你找接口、检查请求并准备代码。" : "Tell an agent what you need; it follows a clear process to find the Endpoint, check the request, and prepare code.",
      href: docHref(locale, "agent-skill"),
      tag: "pontx-hub"
    },
    {
      number: "02",
      title: zh ? "统一 CLI" : "Universal CLI",
      description: zh ? "喜欢在终端工作时，用一组命令搜索目录、查看文档、预览和调用接口。" : "If you prefer the terminal, use one command set to search, read docs, preview, and call Endpoints.",
      href: docHref(locale, "cli"),
      tag: "@pontx/hub-cli"
    },
    {
      number: "03",
      title: zh ? "统一 SDK" : "Unified SDK",
      description: zh ? "准备写进应用时，使用类型安全的客户端和准确的包版本。" : "When you are ready to build, use a type-safe client and the exact published package version.",
      href: docHref(locale, "sdk"),
      tag: "@pontx/<api>"
    },
    {
      number: "04",
      title: zh ? "网站" : "Website",
      description: zh ? "不安装任何工具，直接搜索 API、阅读接口文档并预览请求。" : "Search APIs, read Endpoint docs, and preview requests without installing anything.",
      href: docHref(locale, "web"),
      tag: zh ? "打开即用" : "No setup"
    }
  ];

  return (
    <>
      <DocSection
        id="choose-interface"
        marker="01"
        title={zh ? "从 Agent Skill 开始" : "Start with the Agent Skill"}
        lead={zh ? "先了解 Skill 能替你完成什么，再按自己的习惯选择命令行、SDK 或网站。" : "See what the Skill can handle, then choose the terminal, SDK, or website when you want to work directly."}
      >
        <div className="docs-interface-grid">
          {interfaces.map((item) => (
            <Link key={item.number} to={item.href} className="docs-interface-card">
              <div>
                <span>{item.number}</span>
                <code>{item.tag}</code>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <strong>{zh ? "阅读指南" : "Read the guide"} <i aria-hidden="true">↗</i></strong>
            </Link>
          ))}
        </div>
      </DocSection>

      <DocSection
        id="shared-model"
        marker="02"
        title={zh ? "不同入口，同一份 API 资料" : "One source, whichever way you work"}
        lead={zh ? "无论使用 Skill、CLI、统一 SDK 还是网站，看到的 API 名称、接口和字段都保持一致。" : "The Skill, CLI, Unified SDK, and website use the same API names, Endpoints, and fields."}
      >
        <div className="docs-model-flow" aria-label={zh ? "Pontx 资源层级" : "Pontx resource hierarchy"}>
          <div><span>API</span><strong>{zh ? "产品与认证边界" : "Product and auth boundary"}</strong><code>api:frankfurter</code></div>
          <i aria-hidden="true">→</i>
          <div><span>Endpoint</span><strong>{zh ? "一次可调用能力" : "One callable capability"}</strong><code>endpoint:frankfurter/get-latest-rates</code></div>
          <i aria-hidden="true">→</i>
          <div><span>Schema</span><strong>{zh ? "输入与输出结构" : "Input and output structure"}</strong><code>schema:frankfurter/ExchangeRateResponse</code></div>
        </div>
        <Callout title={zh ? "术语约定" : "Terminology"}>
          {zh
            ? "API 指产品或规范集合；其中的单个 HTTP 能力称为“接口”。Schema 是被接口复用的数据结构。"
            : "API means a product or specification collection; each HTTP capability is an Endpoint. Schemas are reusable input and output structures."}
        </Callout>
      </DocSection>

      <DocSection
        id="one-workflow"
        marker="03"
        title={zh ? "从找到接口到写进项目" : "From finding an API to using it"}
        lead={zh ? "找到合适的接口后，先看清参数和请求，再决定是否发送，最后复制成项目里的代码。" : "Find the right Endpoint, check its parameters and request, decide whether to send it, then copy the result into your project."}
      >
        <CodeTabs
          locale={locale}
          label={zh ? "不同使用方式的快速示例" : "Quick examples by interface"}
          examples={[
            {
              id: "overview-skill",
              label: "Agent Skill",
              language: "shell",
              code: zh
                ? `npx skills add https://github.com/pontjs/pontx-hub --skill pontx-hub

# 安装后，直接告诉 Agent 你想用 API 做什么。`
                : `npx skills add https://github.com/pontjs/pontx-hub --skill pontx-hub

# Then tell your agent what you want to do with an API.`
            },
            {
              id: "overview-cli",
              label: zh ? "统一 CLI" : "Universal CLI",
              language: "shell",
              code: `pnpm add --global @pontx/hub-cli
pontx-hub search "exchange rate" --json
pontx-hub show endpoint:frankfurter/get-latest-rates
pontx-hub frankfurter preview 'Exchange Rates' getLatestRates --base USD`
            },
            {
              id: "overview-sdk",
              label: zh ? "统一 SDK" : "Unified SDK",
              language: "typescript",
              code: `import currencyExchangeClient from "@pontx/frankfurter";

const result = await currencyExchangeClient.exchangeRates.getLatestRates({
  base: "USD",
  symbols: "JPY,CNY"
});`
            }
          ]}
        />
      </DocSection>
    </>
  );
}

function QuickStart({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  return (
    <>
      <DocSection id="install" marker="01" title={zh ? "安装统一 CLI" : "Install the universal CLI"} lead={zh ? "需要 Node.js 20 或更高版本。" : "Requires Node.js 20 or newer."}>
        <CopyableCode locale={locale} language="shell" label={zh ? "终端" : "Terminal"} code={`pnpm add --global @pontx/hub-cli
pontx-hub --version`} />
        <p>{zh ? "只想先看看？网站无需安装，打开 API 目录即可完成同样的发现与预演流程。" : "Want to look around first? The website supports the same discovery and preview flow without an install."}</p>
      </DocSection>

      <DocSection id="discover" marker="02" title={zh ? "搜索并检查" : "Search and inspect"} lead={zh ? "可以按能力、入参、出参或数据结构自然语言搜索。" : "Search by capability, input, output, or data structure in natural language."}>
        <ol className="docs-steps">
          <li><span>1</span><div><strong>{zh ? "搜索你要做的事" : "Search for what you need"}</strong><p>{zh ? "需要把结果交给脚本时加上 --json。" : "Add --json when another command or script needs to read the result."}</p></div></li>
          <li><span>2</span><div><strong>{zh ? "记下资源 ID" : "Keep the resource ID"}</strong><p>{zh ? "把结果中的 API、Endpoint 或 Schema ID 交给 show，就能继续查看详情。" : "Pass an API, Endpoint, or Schema ID to show when you want the full details."}</p></div></li>
        </ol>
        <CopyableCode locale={locale} language="shell" label={zh ? "发现一个汇率接口" : "Discover an exchange-rate endpoint"} code={`pontx-hub search "把欧元换算成美元的接口" --locale zh --json
pontx-hub show endpoint:frankfurter/get-latest-rates
pontx-hub show schema:frankfurter/ExchangeRateResponse`} />
      </DocSection>

      <DocSection id="preview" marker="03" title={zh ? "预演再调用" : "Preview, then call"} lead={zh ? "preview 会解析最终 URL、查询参数、脱敏请求头与请求体，但不会发送到供应商。" : "preview resolves the final URL, query, redacted headers, and body without sending anything to the provider."}>
        <CopyableCode locale={locale} language="shell" label={zh ? "安全请求流程" : "Safe request flow"} code={`pontx-hub frankfurter preview 'Exchange Rates' getLatestRates --base USD

# Only call after the preview looks right.
pontx-hub frankfurter call 'Exchange Rates' getLatestRates --base USD`} />
        <Callout tone="warning" title={zh ? "写操作不会自动执行" : "Mutations never run automatically"}>
          {zh ? "POST、PUT、PATCH 与 DELETE 必须先预演，再对完全相同的请求明确确认，并在 call 时传入 --yes。" : "POST, PUT, PATCH, and DELETE require a preview, explicit confirmation of that exact request, and --yes on call."}
        </Callout>
      </DocSection>

      <DocSection id="integrate" marker="04" title={zh ? "进入 SDK 集成" : "Move into an SDK integration"} lead={zh ? "确认接口后，查看运营方发布的准确包名与版本。" : "After verifying the Endpoint, inspect its exact operator-published package and version."}>
        <CopyableCode locale={locale} language="shell" label={zh ? "检查并安装 SDK" : "Inspect and install the SDK"} code={`pontx-hub sdk frankfurter
pnpm add @pontx/frankfurter`} />
        <div className="docs-next-action">
          <span>→</span>
          <p>{zh ? "继续阅读 SDK 指南，了解统一包命名、客户端形状与独立 API CLI。" : "Continue with the SDK guide for package naming, client shapes, and dedicated API CLIs."}</p>
          <Link to={docHref(locale, "sdk")}>{zh ? "打开 SDK 指南" : "Open the SDK guide"}</Link>
        </div>
      </DocSection>
    </>
  );
}

function WebGuide({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  return (
    <>
      <DocSection id="search" marker="01" title={zh ? "先搜你想做的事" : "Search for what you need"} lead={zh ? "不用先记住 API 名称，像平时提问一样输入你要完成的事情就可以。" : "You do not need to know an API name first. Search for the task you are trying to complete."}>
        <div className="docs-query-list">
          <code>{zh ? "我想查询今天的汇率" : "check today's exchange rates"}</code>
          <code>{zh ? "创建任务需要填写什么" : "what do I need to create a task?"}</code>
          <code>{zh ? "projectId 在哪里用" : "where is projectId used?"}</code>
        </div>
        <p>{zh ? "每条结果都会标明它是 API、接口还是字段。先点开最接近你问题的那一条，页面顶部随时可以回到目录。" : "Each result says whether it is an API, Endpoint, or field. Open the closest match; the catalog is always one click away."}</p>
        <Link className="docs-text-link" to={`/${locale}?q=${encodeURIComponent(zh ? "汇率接口" : "exchange rate")}`}>{zh ? "试着搜索一个汇率 API" : "Try an exchange-rate search"} ↗</Link>
      </DocSection>

      <DocSection id="read" marker="02" title={zh ? "先看概览，再看接口" : "Start with the overview"} lead={zh ? "大多数时候先确认这个 API 是否合适，再进入具体接口查看调用细节。" : "First decide whether the API fits your needs, then open an Endpoint for the calling details."}>
        <div className="docs-feature-table" role="table" aria-label={zh ? "网站页面层级" : "Website page hierarchy"}>
          <div role="row"><strong role="cell">API</strong><p role="cell">{zh ? "先看它解决什么问题、如何认证，以及一共提供哪些接口。" : "See what it is for, how authentication works, and which Endpoints it offers."}</p></div>
          <div role="row"><strong role="cell">Endpoint</strong><p role="cell">{zh ? "真正准备调用时，在这里看地址、参数、请求示例和响应。" : "When you are ready to call it, check the URL, parameters, examples, and responses here."}</p></div>
          <div role="row"><strong role="cell">Schema</strong><p role="cell">{zh ? "遇到不熟悉的字段时，用它查看类型、可选值和限制。" : "Use this when you need the type, allowed values, or limits for an unfamiliar field."}</p></div>
          <div role="row"><strong role="cell">SDK</strong><p role="cell">{zh ? "准备写代码时，复制准确的安装命令和调用示例。" : "When you start coding, copy the exact install command and usage example."}</p></div>
        </div>
      </DocSection>

      <DocSection id="playground" marker="03" title={zh ? "先预览，再决定是否发送" : "Preview before you send"} lead={zh ? "Playground 会把文档里的示例填进表单。你可以先看完整请求，它不会自动发送。" : "The Playground fills the form from a documented example. You can inspect the full request before anything is sent."}>
        <ol className="docs-steps">
          <li><span>1</span><div><strong>{zh ? "选一个现成示例" : "Choose an example"}</strong><p>{zh ? "常用参数会自动填好；需要真实 ID 的地方会提醒你补充。" : "Common values are filled in for you; fields that need a real ID are clearly marked."}</p></div></li>
          <li><span>2</span><div><strong>{zh ? "改成你的参数" : "Use your own values"}</strong><p>{zh ? "表单和 cURL、统一 SDK、CLI 代码会一起更新，方便你逐项核对。" : "The form, cURL, Unified SDK, and CLI examples update together so you can check each value."}</p></div></li>
          <li><span>3</span><div><strong>{zh ? "确认后再发送" : "Send only when ready"}</strong><p>{zh ? "需要凭证时，它只在当前浏览器会话中使用；不能在线调用的 API 仍然可以生成代码。" : "Credentials are used only in the current browser session. APIs that cannot run online can still generate code."}</p></div></li>
        </ol>
        <Callout tone="safe" title={zh ? "凭证只在当前会话使用" : "Credentials stay in the current session"}>
          {zh ? "登录后可以保留去除敏感信息的参数和调用状态，但 API Key、OAuth token、密码及供应商响应不会写入账户历史。" : "Signed-in history can keep sanitized parameters and call status, but never API keys, OAuth tokens, passwords, or provider responses."}
        </Callout>
      </DocSection>

      <DocSection id="return" marker="04" title={zh ? "把可用示例带回项目" : "Take a working example back to your project"} lead={zh ? "参数确认无误后，直接复制成终端命令或应用代码，不需要重新填写一遍。" : "Once the values look right, copy them into a terminal command or application code without entering them again."}>
        <div className="docs-split-actions">
          <Link to={docHref(locale, "cli")}><span>CLI</span><strong>{zh ? "用于脚本和自动化" : "Use it in scripts"}</strong><i aria-hidden="true">→</i></Link>
          <Link to={docHref(locale, "sdk")}><span>{zh ? "统一 SDK" : "Unified SDK"}</span><strong>{zh ? "用于应用代码" : "Use it in application code"}</strong><i aria-hidden="true">→</i></Link>
        </div>
      </DocSection>
    </>
  );
}

function CliGuide({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  return (
    <>
      <DocSection id="install" marker="01" title={zh ? "安装与环境" : "Install and configure"} lead={zh ? "统一 CLI 包名是 @pontx/hub-cli，命令名是 pontx-hub。" : "The universal package is @pontx/hub-cli and its executable is pontx-hub."}>
        <CopyableCode locale={locale} language="shell" label={zh ? "全局安装" : "Global install"} code={`pnpm add --global @pontx/hub-cli
pontx-hub --help`} />
        <Callout title={zh ? "连接其他 Hub 环境" : "Connect another Hub environment"}>
          {zh ? "默认访问 https://pontx.dev。通过 PONTX_HUB_URL 环境变量或全局 --url 选项连接本地或预览环境。" : "The default is https://pontx.dev. Use PONTX_HUB_URL or the global --url option for local and preview environments."}
        </Callout>
      </DocSection>

      <DocSection id="commands" marker="02" title={zh ? "命令地图" : "Command map"} lead={zh ? "发现命令以资源为中心；请求命令遵循 API 产品 → controller → 接口名称的层级。" : "Discovery commands are resource-centered; request commands follow API product → controller → Endpoint name."}>
        <div className="docs-command-map">
          {[
            ["list", zh ? "列出 API 产品" : "List API products"],
            ["search <query>", zh ? "语义搜索 API、Endpoint 与 Schema" : "Search APIs, Endpoints, and Schemas"],
            ["show <resource-id>", zh ? "读取一个稳定资源" : "Inspect a stable resource"],
            ["<api> preview …", zh ? "构造并脱敏预演请求" : "Build a redacted preview"],
            ["<api> call …", zh ? "通过受控 Hub 代理调用" : "Call through the controlled Hub proxy"],
            ["sdk <api>", zh ? "查看 SDK 包名与状态" : "Inspect SDK package and status"],
            ["skill install", zh ? "安装通用 Agent Skill" : "Install the universal Agent Skill"]
          ].map(([command, purpose]) => (
            <div key={command}><code>{command}</code><span>{purpose}</span></div>
          ))}
        </div>
      </DocSection>

      <DocSection id="discovery" marker="03" title={zh ? "搜索与检查" : "Search and inspect"} lead={zh ? "搜索结果会带上稳定的资源 ID，后续命令和脚本可以直接继续使用。" : "Search results include stable resource IDs that later commands and scripts can use directly."}>
        <CodeTabs locale={locale} label={zh ? "CLI 搜索示例" : "CLI search examples"} examples={[
          { id: "cli-natural", label: zh ? "自然语言" : "Natural language", language: "shell", code: `pontx-hub search "返回 dueDate 的接口" --locale zh --json
pontx-hub show endpoint:dida365/get-task-by-id` },
          { id: "cli-schema", label: "Schema", language: "shell", code: `pontx-hub search projectId --type schema --locale en --json
pontx-hub show schema:dida365/TaskCreate` },
          { id: "cli-products", label: zh ? "全部 API" : "All APIs", language: "shell", code: `pontx-hub list --json
pontx-hub sdk frankfurter-v2` }
        ]} />
        <p>{zh ? "--type 可重复传入 api、endpoint 或 schema；--limit 与 --offset 用于稳定分页。" : "Repeat --type with api, endpoint, or schema; use --limit and --offset for stable pagination."}</p>
      </DocSection>

      <DocSection id="requests" marker="04" title={zh ? "构造请求" : "Build a request"} lead={zh ? "接口参数直接写成同名选项；请求体使用 --body，额外声明请求头使用 -H。" : "Pass Endpoint parameters as same-name options; use --body for JSON and -H for an additional declared header."}>
        <CopyableCode locale={locale} language="shell" label={zh ? "命令结构" : "Command anatomy"} code={`pontx-hub <api-product> preview [controller] <endpoint-name> --parameter value

# Controller present
pontx-hub frankfurter preview 'Exchange Rates' getLatestRates --base USD

# No meaningful controller
pontx-hub frankfurter-v2 preview getRates --base USD`} />
        <dl className="docs-definition-list">
          <div><dt><InlineCode>--projectId 123</InlineCode></dt><dd>{zh ? "推荐：直接使用 OAS 参数名。" : "Preferred: use the OAS parameter name directly."}</dd></div>
          <div><dt><InlineCode>--body '&lt;json&gt;'</InlineCode></dt><dd>{zh ? "传入 JSON 请求体。" : "Pass a JSON request body."}</dd></div>
          <div><dt><InlineCode>-H 'Header: value'</InlineCode></dt><dd>{zh ? "补充声明的原始请求头；不要在参数中暴露密钥。" : "Add a declared raw header; never expose secrets in arguments."}</dd></div>
        </dl>
      </DocSection>

      <DocSection id="automation" marker="05" title={zh ? "脚本与自动化" : "Scripts and automation"} lead={zh ? "程序消费时使用 --json，并保留退出码与 error.code。" : "Use --json for programs, and preserve the exit code and error.code."}>
        <CopyableCode locale={locale} language="shell" label={zh ? "机器可读输出" : "Machine-readable output"} code={`pontx-hub search "exchange rate" --type endpoint --json > results.json

# Keep credentials in the environment, never in CLI arguments.
export PROVIDER_ACCESS_TOKEN="<from-your-secret-manager>"
pontx-hub <api-product> preview <endpoint-name>`} />
        <Callout tone="warning" title={zh ? "统一 CLI 与独立 API CLI 不相同" : "Universal and dedicated CLIs are different"}>
          {zh ? "pontx-hub 用于跨目录发现和受控 Hub 调用；pontx-<api> 随特定 SDK 包发布，用于该 API 的本地类型化调用。" : "pontx-hub handles catalog-wide discovery and controlled Hub calls; pontx-<api> ships with one SDK package for that API's local typed calls."}
        </Callout>
      </DocSection>
    </>
  );
}

function SdkGuide({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  return (
    <>
      <DocSection id="contract" marker="01" title={zh ? "统一包契约" : "The shared package contract"} lead={zh ? "包名可预测，类型来自批准的 OAS，发布状态由 Hub 精确验证。" : "Package names are predictable, types come from the approved OAS, and Hub verifies the exact published release."}>
        <div className="docs-contract-strip">
          <div><span>{zh ? "包名" : "Package"}</span><code>@pontx/&lt;api-slug&gt;</code></div>
          <div><span>{zh ? "运行时" : "Runtime"}</span><code>Node.js ≥ 18</code></div>
          <div><span>{zh ? "模块" : "Modules"}</span><code>ESM + CommonJS</code></div>
          <div><span>{zh ? "类型" : "Types"}</span><code>TypeScript declarations</code></div>
        </div>
        <CopyableCode locale={locale} language="shell" label={zh ? "安装" : "Install"} code={`pnpm add @pontx/frankfurter`} />
        <Callout title={zh ? "不要再使用旧包名" : "Do not use legacy names"}>
          {zh ? "早期的 @pontx/api-* 包已冻结。新项目与后续维护只使用 @pontx/<api-slug>。" : "Earlier @pontx/api-* packages are frozen. New projects and ongoing maintenance use only @pontx/<api-slug>."}
        </Callout>
      </DocSection>

      <DocSection id="client-shapes" marker="02" title={zh ? "按认证方式选择客户端" : "Client shapes follow authentication"} lead={zh ? "所有 SDK 都遵循同一命名与类型契约；具体导出会忠实表达 API 的认证和调用模型。" : "Every SDK shares the naming and typing contract; exports accurately reflect each API's auth and call model."}>
        <CodeTabs locale={locale} label={zh ? "SDK 客户端示例" : "SDK client examples"} examples={[
          {
            id: "sdk-default-client",
            label: zh ? "默认客户端" : "Default client",
            language: "typescript",
            code: `import currencyExchangeClient from "@pontx/frankfurter";

const result = await currencyExchangeClient.exchangeRates.getLatestRates({
  base: "USD",
  symbols: "JPY,CNY"
});`
          },
          {
            id: "sdk-factory-client",
            label: zh ? "带凭证工厂" : "Credential factory",
            language: "typescript",
            code: `import { createMassiveClient } from "@pontx/massive";

const client = createMassiveClient({
  apiKey: process.env.MASSIVE_API_KEY!
});
const result = await client.common.getPreviousClose("AAPL", {});`
          },
          {
            id: "sdk-oauth-client",
            label: "OAuth client",
            language: "typescript",
            code: `import { Dida365OAuthClient } from "@pontx/dida365";

const client = new Dida365OAuthClient({
  client_id: process.env.DIDA365_CLIENT_ID!,
  client_secret: process.env.DIDA365_CLIENT_SECRET!
});
await client.authenticate();`
          }
        ]} />
        <p>{zh ? "接口方法按 OAS controller/tag 与 operationId 生成。以每个 API 的 SDK 页面代码为准，不要假定所有供应商拥有相同认证构造器。" : "Endpoint methods are generated from OAS controller/tag and operationId. Follow each API's SDK page instead of assuming every provider has the same auth constructor."}</p>
      </DocSection>

      <DocSection id="dedicated-cli" marker="03" title={zh ? "独立 API CLI" : "Dedicated API CLIs"} lead={zh ? "已发布的 SDK 可以同时暴露 pontx-<api-slug> 命令，直接使用同一份生成类型。" : "A published SDK may also expose pontx-<api-slug>, backed by the same generated contract."}>
        <CopyableCode locale={locale} language="shell" label="Frankfurter dedicated CLI" code={`pnpm add --global @pontx/frankfurter

pontx-frankfurter call exchangeRates.getLatestRates \
  --base USD \
  --symbols JPY,CNY \
  --dry-run`} />
        <div className="docs-comparison">
          <div><span>pontx-hub</span><strong>{zh ? "跨 API 目录" : "Catalog-wide"}</strong><p>{zh ? "搜索、资源检查、Hub 预演与受控代理调用。" : "Search, resource inspection, Hub preview, and controlled proxy calls."}</p></div>
          <div><span>pontx-&lt;api&gt;</span><strong>{zh ? "单个 API" : "One API"}</strong><p>{zh ? "随 SDK 发布，适合本地开发、CI 和 API 专用脚本。" : "Ships with the SDK for local development, CI, and API-specific scripts."}</p></div>
        </div>
      </DocSection>

      <DocSection id="versions" marker="04" title={zh ? "版本与发布边界" : "Versions and release boundaries"} lead={zh ? "访客安装已发布版本；Hub 验证，但不会代表访客发布 npm 包。" : "Visitors install published releases. Hub verifies them but never publishes npm packages on a visitor's behalf."}>
        <div className="docs-version-grid">
          <div><span>major</span><p>{zh ? "不兼容的 OAS 或生成接口变化" : "Breaking OAS or generated API changes"}</p></div>
          <div><span>minor</span><p>{zh ? "向后兼容的新接口或字段" : "Backward-compatible Endpoints or fields"}</p></div>
          <div><span>patch</span><p>{zh ? "文档或生成器修复" : "Documentation or generator fixes"}</p></div>
        </div>
        <Callout tone="safe" title={zh ? "质量证据随 SDK 页面公开" : "Quality evidence is public on every SDK page"}>
          {zh ? "Hub 展示已测试版本、源码提交、单元测试通过率、构建产物 E2E、Node.js 版本矩阵与对应 CI 运行；这些证据必须与目录声明的 sdkVersion 一致。" : "Hub exposes the tested version, source commit, unit pass rate, built-package E2E, Node.js matrix, and CI run. The evidence must match the catalog's sdkVersion."}
        </Callout>
        <Link className="docs-text-link" to={`/${locale}`}>{zh ? "查看所有已发布 SDK" : "Browse published SDKs"} ↗</Link>
      </DocSection>
    </>
  );
}

function SkillGuide({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  return (
    <>
      <DocSection id="install" marker="01" title={zh ? "安装 Skill" : "Install the Skill"} lead={zh ? "Skill 只需要安装一次。之后告诉 Agent 你想完成什么，它会通过 CLI 查资料、检查请求并执行必要的步骤。" : "Install the Skill once. Then tell your agent what you want to accomplish; it uses the CLI to look things up, check the request, and complete the necessary steps."}>
        <CodeTabs locale={locale} label={zh ? "Skill 安装方式" : "Skill installation methods"} examples={[
          { id: "skill-standard", label: "Agent Skills", language: "shell", code: `npx skills add https://github.com/pontjs/pontx-hub --skill pontx-hub` },
          { id: "skill-cli", label: "Pontx Hub CLI", language: "shell", code: `pnpm add --global @pontx/hub-cli
pontx-hub skill install` }
        ]} />
        <p>{zh ? "CLI 默认安装到当前项目的 .agents/skills/pontx-hub；使用 --output 可选择目录，使用 --force 明确更新已有 Skill。" : "The CLI installs to .agents/skills/pontx-hub in the current project. Use --output to choose a location and --force to explicitly update an existing Skill."}</p>
      </DocSection>

      <DocSection id="workflow" marker="02" title={zh ? "一次完整的使用过程" : "A complete request"} lead={zh ? "你可以看到它找到什么、准备发送什么；涉及真实调用时，仍由你决定是否继续。" : "You can see what it found and what it plans to send. You still decide whether a live call should go ahead."}>
        <div className="docs-agent-flow">
          {[
            ["search", zh ? "找到合适的接口" : "Find the right Endpoint"],
            ["show", zh ? "查看参数和说明" : "Read parameters and docs"],
            ["preview", zh ? "核对完整请求" : "Check the full request"],
            ["confirm", zh ? "确认是否会修改数据" : "Confirm any data changes"],
            ["call", zh ? "确认后调用" : "Call after confirmation"],
            ["sdk", zh ? "生成项目代码" : "Generate application code"]
          ].map(([command, label], index) => (
            <div key={command}><span>{String(index + 1).padStart(2, "0")}</span><code>{command}</code><strong>{label}</strong></div>
          ))}
        </div>
        <CopyableCode locale={locale} language="shell" label={zh ? "一次完整的使用示例" : "A complete example"} code={`pontx-hub search "把欧元换算成美元的接口" --locale zh --json
pontx-hub show endpoint:frankfurter/get-latest-rates
pontx-hub frankfurter preview 'Exchange Rates' getLatestRates --base USD
# ${zh ? "只有你确认后，才会真正调用接口。" : "The Endpoint is called only after you confirm."}
pontx-hub frankfurter call 'Exchange Rates' getLatestRates --base USD`} />
      </DocSection>

      <DocSection id="context" marker="03" title={zh ? "需要时再读取 API 资料" : "Load API details when needed"} lead={zh ? "Skill 主要规定做事步骤；具体的 API、接口和字段会按当前问题从目录读取，不必把整份 API 目录放进 Skill。" : "The Skill mainly defines the process. It reads the relevant API, Endpoint, and field details from the catalog for the question at hand instead of bundling the whole catalog."}>
        <div className="docs-context-meter">
          <div><span>{zh ? "Skill 自带" : "Included in the Skill"}</span><strong>{zh ? "查找与调用步骤" : "Search and call steps"}</strong><i /></div>
          <div><span>{zh ? "需要时读取" : "Read when needed"}</span><strong>API → Endpoint → Schema</strong><i /></div>
          <div><span>{zh ? "交付给你" : "Ready for you"}</span><strong>Preview → Call → SDK</strong><i /></div>
        </div>
        <p>{zh ? "这样更容易拿到最新参数，也不会被无关的数据结构干扰。每次选择仍会保留稳定的资源 ID，方便你继续查看和复用。" : "This makes it easier to use current parameters without unrelated data getting in the way. Stable resource IDs remain available for inspection and reuse."}</p>
      </DocSection>

      <DocSection id="boundaries" marker="04" title={zh ? "不可绕过的边界" : "Boundaries that cannot be bypassed"} lead={zh ? "Skill 可以帮你查资料和准备调用，但不会替你决定是否发送请求。" : "The Skill can find information and prepare a call, but it never decides to send the request for you."}>
        <ul className="docs-checklist">
          <li><span>✓</span>{zh ? "搜索、解释或生成代码不等于允许执行。" : "Search, explanation, or code generation does not imply execution permission."}</li>
          <li><span>✓</span>{zh ? "可能修改数据的操作，必须先展示完整请求，再由你确认。" : "Any operation that may change data must show the full request before you confirm it."}</li>
          <li><span>✓</span>{zh ? "凭证来自环境变量，不写入命令参数、日志或回复。" : "Credentials come from environment variables, never arguments, logs, or responses."}</li>
          <li><span>✓</span>{zh ? "只能调用 Hub 目录中批准的 API、接口与服务地址。" : "Only catalog-approved APIs, Endpoints, and servers can be called."}</li>
        </ul>
        <div className="docs-next-action">
          <span>→</span>
          <p>{zh ? "查看 Skill 的公开说明页，或者继续了解凭证与请求确认规则。" : "Read the public Skill overview, or continue with credentials and request confirmation."}</p>
          <Link to={`/${locale}/skills/pontx-hub`}>{zh ? "查看 Skill 说明" : "Read the Skill overview"}</Link>
        </div>
      </DocSection>
    </>
  );
}

function SafetyGuide({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  return (
    <>
      <DocSection id="credentials" marker="01" title={zh ? "凭证留在调用者一侧" : "Credentials stay with the caller"} lead={zh ? "Web 与 CLI 使用不同的本地载体，但都不会把供应商凭证持久化到 Hub。" : "Web and CLI use different local carriers, but neither persists provider credentials in Hub."}>
        <div className="docs-safety-matrix">
          <div><strong>{zh ? "网站" : "Website"}</strong><span>sessionStorage</span><p>{zh ? "API Key、OAuth token 与密码只留在当前浏览器会话。" : "API keys, OAuth tokens, and passwords stay in the current browser session."}</p></div>
          <div><strong>CLI / Skill</strong><span>environment</span><p>{zh ? "从目录声明的环境变量读取；不放进命令参数。" : "Read from catalog-declared environment variables, never command arguments."}</p></div>
          <div><strong>{zh ? "账户数据" : "Account data"}</strong><span>never</span><p>{zh ? "收藏与脱敏历史不包含认证对象或供应商响应。" : "Favorites and sanitized history exclude auth objects and provider responses."}</p></div>
        </div>
      </DocSection>

      <DocSection id="preview" marker="02" title={zh ? "预演是固定步骤" : "Preview is a fixed step"} lead={zh ? "预演解析真实请求，并在发送前把所有影响范围展示出来。" : "Preview resolves the real request and exposes its complete scope before sending."}>
        <CopyableCode locale={locale} language="shell" label={zh ? "预演请求" : "Preview a request"} code={`pontx-hub <api-product> preview [controller] <endpoint-name> --parameter value

# Review: method · host · path · query · redacted headers · body`} />
        <div className="docs-preview-list">
          <span>HTTP method</span><span>approved host</span><span>resolved path</span><span>query</span><span>redacted headers</span><span>body</span>
        </div>
      </DocSection>

      <DocSection id="mutations" marker="03" title={zh ? "写操作需要精确确认" : "Mutations require exact confirmation"} lead={zh ? "确认绑定到规范化请求；任何参数、请求体、服务地址或接口变化都会使确认失效。" : "Confirmation is bound to the normalized request; changing parameters, body, server, or Endpoint invalidates it."}>
        <div className="docs-mutation-flow">
          <div><span>1</span><strong>preview</strong><p>{zh ? "生成脱敏请求" : "Build redacted request"}</p></div>
          <i aria-hidden="true">→</i>
          <div><span>2</span><strong>{zh ? "用户确认" : "user confirms"}</strong><p>{zh ? "确认完全相同的副作用" : "Approve the exact side effect"}</p></div>
          <i aria-hidden="true">→</i>
          <div><span>3</span><strong>call --yes</strong><p>{zh ? "发送未改变的请求" : "Send the unchanged request"}</p></div>
        </div>
        <Callout tone="warning" title={zh ? "查看文档不会发送请求" : "Reading docs never sends a request"}>
          {zh ? "GET 与 HEAD 不需要 --yes，但搜索、查看文档和预演都只帮助你检查请求；只有明确调用时才会发送。" : "GET and HEAD do not need --yes, but search, documentation, and preview only help you inspect the request. It is sent only when you explicitly call it."}
        </Callout>
      </DocSection>

      <DocSection id="network" marker="04" title={zh ? "只访问目录批准的目标" : "Only catalog-approved destinations"} lead={zh ? "调用方不能把任意 URL 交给 Hub 代理。" : "Callers cannot hand an arbitrary URL to the Hub proxy."}>
        <ul className="docs-checklist">
          <li><span>✓</span>{zh ? "API、接口和 server 组合必须来自已审核目录。" : "The API, Endpoint, and server combination must come from the reviewed catalog."}</li>
          <li><span>✓</span>{zh ? "拒绝私有、回环、链路本地、元数据主机与不安全重定向。" : "Private, loopback, link-local, metadata hosts, and unsafe redirects are denied."}</li>
          <li><span>✓</span>{zh ? "请求头、请求体、超时和响应大小受到服务端限制。" : "Headers, body, timeout, and captured response size are server-limited."}</li>
          <li><span>✓</span>{zh ? "禁止代理的 API 仍可阅读、预演并生成 SDK/CLI 代码。" : "Non-proxied APIs remain readable, previewable, and available for SDK/CLI code generation."}</li>
        </ul>
        <Link className="docs-text-link" to={docHref(locale, "agent-skill")}>{zh ? "了解 Skill 如何处理这些边界" : "See how the Skill handles these boundaries"} ↗</Link>
      </DocSection>
    </>
  );
}

export function DocsContent({ locale, slug }: { locale: Locale; slug: DocSlug }) {
  if (slug === "overview") return <Overview locale={locale} />;
  if (slug === "quick-start") return <QuickStart locale={locale} />;
  if (slug === "web") return <WebGuide locale={locale} />;
  if (slug === "cli") return <CliGuide locale={locale} />;
  if (slug === "sdk") return <SdkGuide locale={locale} />;
  if (slug === "agent-skill") return <SkillGuide locale={locale} />;
  return <SafetyGuide locale={locale} />;
}
