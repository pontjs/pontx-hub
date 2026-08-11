# Pontx Hub 每日生产巡检

## 2026-08-11（Asia/Shanghai）

### 定向生产回归

- 部署：生产别名 `https://pontx-hub.vercel.app` 指向 Ready 部署 `dpl_9g49Mu9Ct7doHXhVuiHWNKrht5cZ`，对应 `main` 提交 `644038c`。
- `REG-FRANKFURTER-V2-001`：通过。默认表单仅预填 `base=EUR`，不再同时预填互斥的 `date` 与 `from/to/group`。
- `REG-PREVIEW-ONLY-001`：通过。Stooq 与 Yahoo Finance 概览均保留请求预览和禁用原因，不再显示“执行请求”。
- `REG-SCHEMA-LONG-REF-001`：通过。CNBC `FormattedQuoteResponse` 在 390×844 下 `clientWidth=390`、`scrollWidth=390`。
- `REG-SEARCH-LONG-PATH-001`：通过。英文搜索 `exchange rate` 在 768×900 与 1440×1000 下文档宽度均等于视口宽度。
- OAuth 工具栏：Dida365 概览在 1440×1000 与 390×844 下控件顺序、语义名称和禁用状态正确；移动端 `clientWidth=390`、`scrollWidth=390`。未填写或保存任何凭据，也未发起授权。

### 问题状态

2026-08-10 记录的 4 个问题本轮均标记为“待复核（1/2）”。按巡检规则，需再完成一次独立生产巡检后标记“已恢复”；历史问题和证据继续保留。

## 2026-08-10（Asia/Shanghai）

### 运行摘要

- sitemap：364/364 个 URL 返回 HTTP 200；182 个中文页、182 个英文页。
- SSR/SEO：364/364 个页面通过唯一 H1、title、description、自引用 canonical、`html lang` 与 `zh-CN`/`en`/`x-default` alternate 检查。
- API：11/11 个 API 完成桌面核心旅程；共核对 75 个 Endpoint、92 个 Schema 的目录与 sitemap 清单。
- 响应式：390×844 检查 33 个代表页面（每个 API 的概览、Endpoint、Schema）；另检查 768×900 与 1440×1000 的内容压力场景。
- 真实只读调用：Frankfurter、CNBC、Eastmoney、i3investor、Sina、Tencent 成功返回 200；Dida365 与 Massive 因鉴权跳过；写入型请求均未执行。
- 其他：中英文搜索/空结果、任务切换、cURL/TypeScript SDK/Hub CLI 代码生成、已发布/计划中 SDK、Agent Skill、移动菜单、深链语言切换与 404 恢复页均已检查。
- 浏览器控制台未发现站点脚本错误。ChatGPT 浏览器运行时自身的 Statsig 超时未计入站点问题。
- 覆盖限制：浏览器控制环境的 Tab/Enter 键未产生焦点变化，搜索键盘提交与完整键盘可访问性本次无法可靠判定；已保留 `SEARCH-006`、`A11Y-001` 供后续环境复核。

### 新发现问题

#### [P1] `QA-FRANKFURTER-V2-CONFLICTING-DEFAULTS` 默认快速调用预填互斥参数，主操作稳定返回 422

- 归属：`pontx-hub`；次要核查 `pontx-api-metadata` 的示例/互斥参数语义。
- 旅程：`API-002`、`PLAY-001`、`REG-FRANKFURTER-V2-001`。
- 环境：生产站，中文，1440×1000；首次/最近发现均为 2026-08-10。
- 路径：`https://pontx-hub.vercel.app/zh/apis/frankfurter-v2`。
- 步骤：保持默认“快速调用”表单不变，点击“执行请求”。
- 预期：默认体验使用一组合法参数直接成功，或先要求用户在单日与时间范围模式之间选择。
- 实际：表单同时预填 `date=2024-01-15`、`from=2024-01-01`、`to=2024-01-31`、`group=month` 等参数，返回 422 `{"status":422,"message":"conflicting params"}`。
- 证据：生成 URL 为 `https://api.frankfurter.dev/v2/rates?date=2024-01-15&from=2024-01-01&to=2024-01-31&base=EUR&quotes=USD%2CGBP%2CJPY&providers=ECB%2CTCMB&group=month&expand=providers`。直接请求上游同样返回 422；仅保留 `date/base/quotes` 时返回 200。
- 用户影响：无需任何输入，首页主 CTA 即失败，首次体验无法完成。

#### [P1] `QA-PREVIEW-ONLY-EXECUTE-ACTION` 仅预览 API 仍显示可执行按钮，并被包装成通用 500

- 归属：`pontx-hub`；次要核查 `pontx-shadcn-ui` Playground 的禁用能力合同。
- 旅程：`PLAY-002`、`REG-PREVIEW-ONLY-001`。
- 环境：生产站，中文，1440×1000；首次/最近发现均为 2026-08-10。
- 路径：`/zh/apis/stooq`、`/zh/apis/yahoo-finance`。
- 步骤：观察“在线调用 仅预览”，随后点击仍处于可用状态的“执行请求”。
- 预期：仅预览操作不显示或禁用执行动作，并展示元数据中的 `proxyDisabledReason`。
- 实际：按钮可点击；Stooq 显示 500、0ms 和 `{"error":"This API is configured for preview-only mode"}`，Yahoo Finance 同样显示通用 500。
- 证据：两组 operation 元数据均为 `proxyEnabled: false`，但页面仍把请求发送至执行入口。
- 用户影响：误导用户认为接口或服务器故障，也破坏“preview-first、显式批准变更”的产品边界。

#### [P2] `QA-SCHEMA-LONG-REF-MOBILE-OVERFLOW` 长 Schema 引用在 390px 产生文档级横向滚动

- 归属：`pontx-shadcn-ui` Schema Viewer。
- 旅程：`SCHEMA-001`、`RESPONSIVE-001`、`REG-SCHEMA-LONG-REF-001`。
- 环境：生产站，中文，390×844；首次/最近发现均为 2026-08-10。
- 路径：`/zh/apis/cnbc-market-data/schemas/FormattedQuoteResponse`。
- 步骤：移动端打开 Schema 页面并查看引用类型。
- 预期：长类型名换行、截断或允许局部滚动，文档宽度保持 390px。
- 实际：`documentElement.clientWidth=390`、`scrollWidth=471`，产生 81px 横向溢出；`ExtendedMarketQuote` 元素右边界为 471px。
- 用户影响：移动端正文和导航可被横向拖动，部分内容处于视口外。

#### [P2] `QA-SEARCH-LONG-PATH-DESKTOP-OVERFLOW` 搜索结果中的长 Endpoint 路径撑宽页面

- 归属：`pontx-hub` 搜索结果布局。
- 旅程：`SEARCH-002`、`RESPONSIVE-002`、`RESPONSIVE-003`、`REG-SEARCH-LONG-PATH-001`。
- 环境：生产站，英文，768×900 与 1440×1000；首次/最近发现均为 2026-08-10。
- 路径：`/en?q=exchange%20rate`。
- 步骤：搜索 `exchange rate`，滚动到 Massive 的聚合行情 Endpoint 结果。
- 预期：长路径在卡片内换行、截断或局部滚动，文档宽度不超过视口。
- 实际：768px 视口下 `scrollWidth=827`，横向溢出 59px；1440px 下仍溢出 2px。越界元素为 `GET /v2/aggs/ticker/{stocksTicker}/range/{multiplier}/{timespan}/{from}/{to}`。
- 用户影响：平板/窄桌面出现明显横向滚动，搜索结果布局不稳定。

### 本轮排除的误报

- Dida365 与 Eastmoney 的深链语言切换最初因页面加载时序读到旧 URL；等待导航完成后 URL、canonical 与 `html lang` 均正确。
- Sina Finance 首次读取响应状态过早；等待响应完成后真实只读调用返回 200。
- 搜索框 Enter/Tab 未响应同时出现在浏览器控制环境的其他可聚焦控件上，因此暂列覆盖限制，不登记为站点问题。

### 后续回归重点

下一轮优先重跑 4 个 `REG-*` 旅程，并继续验证搜索键盘提交、OAuth/API Key 的无凭据安全状态及七天滚动分片。上述问题修复后需连续两次生产巡检通过，再在本文件标记为已恢复。
