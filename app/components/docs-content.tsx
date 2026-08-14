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
      title: zh ? "网站" : "Website",
      description: zh ? "搜索、阅读、预演；最适合第一次了解 API。" : "Search, read, and preview—the best place to understand an API first.",
      href: docHref(locale, "web"),
      tag: zh ? "无需安装" : "No install"
    },
    {
      number: "02",
      title: zh ? "统一 CLI" : "Universal CLI",
      description: zh ? "跨整个目录搜索与调用，适合终端、脚本和 Agent。" : "Search and call across the catalog from terminals, scripts, and agents.",
      href: docHref(locale, "cli"),
      tag: "@pontx/hub-cli"
    },
    {
      number: "03",
      title: "TypeScript SDK",
      description: zh ? "把验证过的请求变成类型安全的生产代码。" : "Turn a verified request into type-safe production code.",
      href: docHref(locale, "sdk"),
      tag: "@pontx/<api>"
    },
    {
      number: "04",
      title: "Agent Skill",
      description: zh ? "让 Agent 按需检索实时目录，并遵循同一安全边界。" : "Let agents retrieve the live catalog on demand under the same safety rules.",
      href: docHref(locale, "agent-skill"),
      tag: "pontx-hub"
    }
  ];

  return (
    <>
      <DocSection
        id="choose-interface"
        marker="01"
        title={zh ? "选择你的使用方式" : "Choose your interface"}
        lead={zh ? "它们不是四套产品，而是同一份目录的四种入口。" : "These are four interfaces to the same catalog—not four separate products."}
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
        title={zh ? "一套共享模型" : "One shared model"}
        lead={zh ? "稳定资源 ID、链接与代码命名让 Web、CLI、SDK 与 Agent 互相衔接。" : "Stable resource IDs, links, and code names connect Web, CLI, SDK, and agents."}
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
        title={zh ? "同一条集成路径" : "One integration path"}
        lead={zh ? "先发现，再理解；先预演，再执行；最后把已验证的形状带进代码。" : "Discover, inspect, preview, execute, then carry the verified shape into code."}
      >
        <CodeTabs
          locale={locale}
          label={zh ? "不同使用方式的快速示例" : "Quick examples by interface"}
          examples={[
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
              label: "TypeScript SDK",
              language: "typescript",
              code: `import currencyExchangeClient from "@pontx/frankfurter";

const result = await currencyExchangeClient.exchangeRates.getLatestRates({
  base: "USD",
  symbols: "JPY,CNY"
});`
            },
            {
              id: "overview-skill",
              label: "Agent Skill",
              language: "shell",
              code: `npx skills add https://github.com/pontjs/pontx-hub --skill pontx-hub

# The agent now follows search → show → preview → call → sdk.`
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
          <li><span>1</span><div><strong>{zh ? "搜索意图" : "Search an intent"}</strong><p>{zh ? "加上 --json 可获得稳定、可编程的结果与匹配原因。" : "Add --json for stable, programmable results with match provenance."}</p></div></li>
          <li><span>2</span><div><strong>{zh ? "复制稳定资源 ID" : "Copy the stable resource ID"}</strong><p>{zh ? "搜索结果中的 API、Endpoint 与 Schema ID 都可交给 show。" : "API, Endpoint, and Schema IDs from search can all be passed to show."}</p></div></li>
        </ol>
        <CopyableCode locale={locale} language="shell" label={zh ? "发现一个汇率接口" : "Discover an exchange-rate endpoint"} code={`pontx-hub search "把欧元换算成美元的接口" --locale zh --json
pontx-hub show endpoint:frankfurter/get-latest-rates
pontx-hub show schema:frankfurter/ExchangeRateResponse`} />
      </DocSection>

      <DocSection id="preview" marker="03" title={zh ? "预演再调用" : "Preview, then call"} lead={zh ? "preview 会解析最终 URL、查询参数、脱敏请求头与请求体，但不会发送到供应商。" : "preview resolves the final URL, query, redacted headers, and body without sending anything to the provider."}>
        <CopyableCode locale={locale} language="shell" label={zh ? "安全请求流程" : "Safe request flow"} code={`pontx-hub frankfurter preview 'Exchange Rates' getLatestRates --base USD

# Only run after the preview matches your intent.
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
      <DocSection id="search" marker="01" title={zh ? "从意图开始搜索" : "Start with intent"} lead={zh ? "首页搜索覆盖 API 产品、接口、参数、请求体、响应与 Schema 属性。" : "Home search covers API products, Endpoints, parameters, request bodies, responses, and Schema properties."}>
        <div className="docs-query-list">
          <code>{zh ? "创建任务的入参" : "input for creating a task"}</code>
          <code>{zh ? "返回 dueDate 的接口" : "endpoint that returns dueDate"}</code>
          <code>projectId</code>
        </div>
        <p>{zh ? "结果会说明匹配来自产品说明、参数、请求、响应还是数据结构；选择结果后，页面会重新建立所属 API 的上下文。" : "Results explain whether the match came from product copy, parameters, requests, responses, or Schemas. Every destination re-establishes its parent API context."}</p>
        <Link className="docs-text-link" to={`/${locale}?q=${encodeURIComponent(zh ? "汇率接口" : "exchange rate")}`}>{zh ? "在目录中试一次搜索" : "Try a catalog search"} ↗</Link>
      </DocSection>

      <DocSection id="read" marker="02" title={zh ? "读懂资源层级" : "Read the resource hierarchy"} lead={zh ? "每一层只回答一类问题，并保留返回目录和访问同级资源的路径。" : "Each layer answers one kind of question and keeps a route back to the catalog and sibling resources."}>
        <div className="docs-feature-table" role="table" aria-label={zh ? "网站页面层级" : "Website page hierarchy"}>
          <div role="row"><strong role="cell">API</strong><p role="cell">{zh ? "了解供应商、认证、服务地址、接口范围与 SDK 状态。" : "Understand the provider, auth, servers, Endpoint scope, and SDK status."}</p></div>
          <div role="row"><strong role="cell">Endpoint</strong><p role="cell">{zh ? "查看方法、路径、参数、请求体、响应与可运行示例。" : "Read the method, path, parameters, body, responses, and runnable examples."}</p></div>
          <div role="row"><strong role="cell">Schema</strong><p role="cell">{zh ? "追踪嵌套字段、类型、枚举、约束与被哪些接口复用。" : "Trace nested fields, types, enums, constraints, and referencing Endpoints."}</p></div>
          <div role="row"><strong role="cell">SDK</strong><p role="cell">{zh ? "复制与批准 OAS 版本绑定的安装和调用代码。" : "Copy install and usage code bound to the approved OAS version."}</p></div>
        </div>
      </DocSection>

      <DocSection id="playground" marker="03" title={zh ? "在 Playground 中预演" : "Preview in the Playground"} lead={zh ? "接口文档、参数表单和输出视图共用同一个请求状态。" : "Endpoint docs, parameter inputs, and output views share one request state."}>
        <ol className="docs-steps">
          <li><span>1</span><div><strong>{zh ? "选择已验证示例" : "Select a verified example"}</strong><p>{zh ? "就绪示例会填充稳定输入；动态 ID 会明确标出来源或要求你输入。" : "Ready examples prefill stable inputs; dynamic IDs show their source or ask for input."}</p></div></li>
          <li><span>2</span><div><strong>{zh ? "检查请求预览" : "Inspect the request preview"}</strong><p>{zh ? "切换 cURL、TypeScript SDK 与 CLI 视图时，请求参数保持同步。" : "cURL, TypeScript SDK, and CLI views stay synchronized with the same inputs."}</p></div></li>
          <li><span>3</span><div><strong>{zh ? "按需执行" : "Execute only when needed"}</strong><p>{zh ? "供应商凭证只留在当前浏览器会话；不支持代理的 API 仍可预演和生成代码。" : "Provider credentials stay in the browser session; non-proxied APIs can still preview and generate code."}</p></div></li>
        </ol>
        <Callout tone="safe" title={zh ? "凭证不会进入账户历史" : "Credentials never enter account history"}>
          {zh ? "即使登录后保留 Playground 历史，Hub 也只保存脱敏的输入快照与状态，不保存认证对象、供应商响应或凭证字段。" : "Even with signed-in Playground history, Hub stores only sanitized input snapshots and status—never auth objects, provider responses, or credential fields."}
        </Callout>
      </DocSection>

      <DocSection id="return" marker="04" title={zh ? "把验证结果带回代码" : "Bring verified inputs back to code"} lead={zh ? "网站不是终点；它负责让请求形状可见、可检查、可复制。" : "The website is not the endpoint; it makes the request shape visible, reviewable, and portable."}>
        <div className="docs-split-actions">
          <Link to={docHref(locale, "cli")}><span>CLI</span><strong>{zh ? "进入自动化与脚本" : "Move into automation"}</strong><i aria-hidden="true">→</i></Link>
          <Link to={docHref(locale, "sdk")}><span>SDK</span><strong>{zh ? "进入类型安全集成" : "Move into typed integration"}</strong><i aria-hidden="true">→</i></Link>
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

      <DocSection id="discovery" marker="03" title={zh ? "搜索与检查" : "Search and inspect"} lead={zh ? "搜索结果使用稳定 ID；后续命令和 Agent 不必猜测 URL。" : "Search results use stable IDs, so later commands and agents never need to guess URLs."}>
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
          <div><dt><InlineCode>-p key=value</InlineCode></dt><dd>{zh ? "兼容旧脚本；新代码优先同名选项。" : "Compatibility fallback; prefer named options in new code."}</dd></div>
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
      <DocSection id="install" marker="01" title={zh ? "安装 Skill" : "Install the Skill"} lead={zh ? "Skill 只安装一次；API 数据始终通过 CLI 按需读取。" : "Install once; API data is always retrieved on demand through the CLI."}>
        <CodeTabs locale={locale} label={zh ? "Skill 安装方式" : "Skill installation methods"} examples={[
          { id: "skill-standard", label: "Agent Skills", language: "shell", code: `npx skills add https://github.com/pontjs/pontx-hub --skill pontx-hub` },
          { id: "skill-cli", label: "Pontx Hub CLI", language: "shell", code: `pnpm add --global @pontx/hub-cli
pontx-hub skill install` }
        ]} />
        <p>{zh ? "CLI 默认安装到当前项目的 .agents/skills/pontx-hub；使用 --output 可选择目录，使用 --force 明确更新已有 Skill。" : "The CLI installs to .agents/skills/pontx-hub in the current project. Use --output to choose a location and --force to explicitly update an existing Skill."}</p>
      </DocSection>

      <DocSection id="workflow" marker="02" title={zh ? "Agent 工作流" : "Agent workflow"} lead={zh ? "Skill 把一个开放式 API 请求收敛为可审查的六个步骤。" : "The Skill turns an open-ended API request into six reviewable steps."}>
        <div className="docs-agent-flow">
          {[
            ["search", zh ? "搜索能力" : "Find capability"],
            ["show", zh ? "检查资源" : "Inspect resource"],
            ["preview", zh ? "预演请求" : "Preview request"],
            ["confirm", zh ? "确认副作用" : "Confirm side effect"],
            ["call", zh ? "按授权调用" : "Call when authorized"],
            ["sdk", zh ? "生成集成" : "Generate integration"]
          ].map(([command, label], index) => (
            <div key={command}><span>{String(index + 1).padStart(2, "0")}</span><code>{command}</code><strong>{label}</strong></div>
          ))}
        </div>
        <CopyableCode locale={locale} language="shell" label={zh ? "Agent 执行轨迹" : "Agent execution trace"} code={`pontx-hub search "把欧元换算成美元的接口" --locale zh --json
pontx-hub show endpoint:frankfurter/get-latest-rates
pontx-hub frankfurter preview 'Exchange Rates' getLatestRates --base USD
# The agent calls only after the user asks for execution.
pontx-hub frankfurter call 'Exchange Rates' getLatestRates --base USD`} />
      </DocSection>

      <DocSection id="context" marker="03" title={zh ? "保持上下文轻量" : "Keep context lean"} lead={zh ? "Skill 本身不复制整个 OpenAPI 目录，而是教 Agent 何时加载哪一种资源。" : "The Skill does not copy the whole OpenAPI catalog; it teaches the agent which resource to load and when."}>
        <div className="docs-context-meter">
          <div><span>{zh ? "常驻上下文" : "Long-lived context"}</span><strong>Skill workflow</strong><i /></div>
          <div><span>{zh ? "按需加载" : "On demand"}</span><strong>API → Endpoint → Schema</strong><i /></div>
          <div><span>{zh ? "最终输出" : "Final output"}</span><strong>Preview → Call → SDK</strong><i /></div>
        </div>
        <p>{zh ? "这样可以减少陈旧文档、错误参数和无关 Schema 对推理的干扰，同时让每次选择都能回溯到稳定资源 ID。" : "This reduces stale docs, wrong parameters, and irrelevant Schemas while keeping every choice traceable to a stable resource ID."}</p>
      </DocSection>

      <DocSection id="boundaries" marker="04" title={zh ? "不可绕过的边界" : "Boundaries that cannot be bypassed"} lead={zh ? "Skill 扩展检索和执行能力，但不会扩展用户授权。" : "The Skill extends retrieval and execution capability, not user authorization."}>
        <ul className="docs-checklist">
          <li><span>✓</span>{zh ? "搜索、解释或生成代码不等于允许执行。" : "Search, explanation, or code generation does not imply execution permission."}</li>
          <li><span>✓</span>{zh ? "写操作必须先展示精确预演，再获得用户确认。" : "Mutations require an exact preview before user confirmation."}</li>
          <li><span>✓</span>{zh ? "凭证来自环境变量，不写入命令参数、日志或回复。" : "Credentials come from environment variables, never arguments, logs, or responses."}</li>
          <li><span>✓</span>{zh ? "只能调用 Hub 目录中批准的 API、接口与服务地址。" : "Only catalog-approved APIs, Endpoints, and servers can be called."}</li>
        </ul>
        <div className="docs-next-action">
          <span>→</span>
          <p>{zh ? "查看可索引的 Skill 说明页，或深入理解凭证与写操作确认。" : "Open the indexable Skill page, or read the credential and mutation model in depth."}</p>
          <Link to={`/${locale}/skills/pontx-hub`}>{zh ? "打开 Skill 页面" : "Open the Skill page"}</Link>
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
        <Callout tone="warning" title={zh ? "读取请求也需要执行意图" : "Reads still require execution intent"}>
          {zh ? "GET 与 HEAD 不需要 --yes，但搜索、查看文档或要求预演都不自动授权真实调用。" : "GET and HEAD do not need --yes, but search, documentation, or preview requests do not automatically authorize a live call."}
        </Callout>
      </DocSection>

      <DocSection id="network" marker="04" title={zh ? "只访问目录批准的目标" : "Only catalog-approved destinations"} lead={zh ? "调用方不能把任意 URL 交给 Hub 代理。" : "Callers cannot hand an arbitrary URL to the Hub proxy."}>
        <ul className="docs-checklist">
          <li><span>✓</span>{zh ? "API、接口和 server 组合必须来自已审核目录。" : "The API, Endpoint, and server combination must come from the reviewed catalog."}</li>
          <li><span>✓</span>{zh ? "拒绝私有、回环、链路本地、元数据主机与不安全重定向。" : "Private, loopback, link-local, metadata hosts, and unsafe redirects are denied."}</li>
          <li><span>✓</span>{zh ? "请求头、请求体、超时和响应大小受到服务端限制。" : "Headers, body, timeout, and captured response size are server-limited."}</li>
          <li><span>✓</span>{zh ? "禁止代理的 API 仍可阅读、预演并生成 SDK/CLI 代码。" : "Non-proxied APIs remain readable, previewable, and available for SDK/CLI code generation."}</li>
        </ul>
        <Link className="docs-text-link" to={docHref(locale, "agent-skill")}>{zh ? "查看 Agent 如何遵守这些边界" : "See how agents follow these boundaries"} ↗</Link>
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
