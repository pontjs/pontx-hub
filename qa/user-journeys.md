# Pontx Hub 生产站每日巡检用户旅程

本文件是生产站 `https://pontx-hub.vercel.app` 的巡检来源。定时任务每天 03:00（Asia/Shanghai）读取本文件与 `qa/core-e2e-cases.json`，执行结果追加到仓库根目录 `issues.md`。日常巡检只允许维护这三个巡检资产，不修复源码、不提交、不推送，也不执行写入型 API。

## 维护规则

1. 每次先读取生产 sitemap、目录和 API 元数据，自动发现新增或下线的页面、API、接口、Schema、SDK 与语言；发现覆盖缺口时先补旅程，再执行。
2. 旅程 ID 和问题 signature 保持稳定。已确认问题必须新增回归旅程；问题消失时在 `issues.md` 标记“待复核/已恢复”，不要直接删除历史记录。
3. 每天先执行每个 API 的核心端到端金丝雀旅程，再做全站结构检查；用七天滚动矩阵覆盖其余接口、Schema、搜索词、错误状态和内容压力场景。
4. 每个 API 必须有至少一个只读、无副作用的 Endpoint 完成真实调用。OAuth/API Key 从定时任务的安全环境读取，只输入当前浏览器会话且永不输出、持久化或写入报告；缺少凭据记为 `BLOCKED`，不得算通过。
5. `proxyEnabled=false`、仅预览、没有可执行 Endpoint、默认参数不合法、请求未发出、非 2xx、空/错误响应或必须重试才能成功，都不能记为 PASS。写入型接口仍禁止执行，API 必须另提供只读金丝雀、sandbox 或明确的 dry-run。
6. 每条失败记录环境、路径、语言、视口、步骤、预期、实际、证据、首次/最近发现日期、严重级别和推测归属仓库。相同 signature 当天只更新一次。

## 核心端到端硬门槛

每天对 `qa/core-e2e-cases.json` 中的所有 API 逐条完成以下真实用户闭环，不允许用直接 HTTP 请求代替浏览器步骤：

1. 从本地化目录页输入该 API 的自然语言任务，按 Enter 提交搜索。
2. 在搜索结果中找到清单指定的 Endpoint；激活结果并确认进入预期文档 URL。
3. 阅读并核对 H1、API 上下文、方法/路径、参数说明、响应结构和示例。
4. 点击“试用”，确认 Playground 与当前 Endpoint 一致，填写清单中的非敏感参数；鉴权值仅从安全环境注入当前会话。
5. 点击“执行请求”，确认浏览器实际向 Hub execute 入口发出请求。
6. 首次尝试即获得 2xx，并通过清单中的非空、内容类型和关键字段断言；同时记录最终上游 URL、状态码、耗时和脱敏响应摘要。

单 API 状态只有以下四种：

- `PASS`：搜索、文档和首次真实调试全部通过。
- `FAIL`：产品能力、集成、上游响应或用户体验导致闭环失败；即使重试成功也不能改成 PASS。
- `FLAKY`：首次失败、同一参数的一次诊断性重试成功；必须登记问题并保留首次失败证据。
- `BLOCKED`：安全凭据或受控测试数据缺失，无法执行；这不是自动判定的代码缺陷，但全站巡检仍不得通过。

当天全局结果只有在所有 API 均为 PASS 时才能标记 `PASS 11/11`。任何 `FAIL`、`FLAKY` 或 `BLOCKED` 都使核心巡检总结果为 FAIL，并在 `issues.md` 建立稳定 signature。

## 当前站点清单

最后维护：2026-08-11，Asia/Shanghai。

| API | 接口 | Schema | 鉴权 | SDK | 每日金丝雀 Endpoint |
| --- | ---: | ---: | --- | --- | --- |
| dida365 | 37 | 33 | OAuth 2 | 已发布 | `getUserProjects`（需要安全 canary token） |
| frankfurter | 5 | 4 | 无 | 已发布 | `getLatestRates` |
| frankfurter-v2 | 5 | 4 | 无 | 计划中 | `getProviders` |
| massive | 6 | 17 | API Key | 计划中 | `getPreviousClose`（需要安全 canary key） |
| cnbc-market-data | 2 | 5 | 无 | 计划中 | `getRestQuotes` |
| eastmoney-funds | 4 | 9 | 无 | 计划中 | `listHistoricalNav` |
| i3investor-sgx | 2 | 2 | 无 | 计划中 | `getSgxStockOverviewPage` |
| sina-finance | 2 | 5 | 无 | 计划中 | `getQuoteSnapshots` |
| stooq | 2 | 4 | 无 | 计划中 | `downloadLatestQuotes`（当前不可执行，必须报 FAIL） |
| tencent-finance | 3 | 6 | 无 | 计划中 | `getQuoteSnapshots` |
| yahoo-finance | 7 | 3 | 无 | 计划中 | `getChart`（当前不可执行，必须报 FAIL） |

当前基线：11 个 API、75 个 Endpoint、92 个 Schema；sitemap 共 364 个双语规范 URL（中文 182、英文 182）。数量变化不一定是错误，但必须同步本表并确认 sitemap、导航和 SEO 合同仍成立。

## 每日必跑旅程

### 目录、导航与搜索

- `NAV-001`：访问 `/`，验证语言协商、目录 H1、API 卡片、主导航和无横向溢出。
- `NAV-002`：从目录进入每个 API；从概览进入 Endpoint、Schema、SDK，再通过“全部 API”一步返回目录。
- `NAV-003`：在 390px 移动端打开深层 Endpoint/Schema，展开菜单，确认当前位置、菜单可用且没有遮挡。
- `SEARCH-001`：中文语义词“创建任务的入参”，结果应包含滴答清单创建任务相关接口。
- `SEARCH-002`：英文语义词“exchange rate”，结果应包含 Frankfurter；结果卡片的长接口路径必须换行或裁剪。
- `SEARCH-003`：精确接口 ID `getChart`，验证接口可发现且链接正确。
- `SEARCH-004`：Schema 属性 `projectId`，验证跨 API/Schema 结果和高亮。
- `SEARCH-005`：不存在的词，验证空结果说明、清除搜索与返回目录入口。
- `SEARCH-006`：验证搜索框键盘提交、Tab 焦点顺序、Enter 提交、深链刷新，以及切换语言后保留安全查询参数。

### API 概览、Endpoint、Schema 与 Playground

- `E2E-CORE-001`：严格按 `qa/core-e2e-cases.json` 对每个 API 执行“搜索 → Endpoint 文档 → 试用 → 首次 2xx → 响应断言”；这是每日最高优先级硬门槛。
- `API-001`：对清单中的每个 API 检查本地化标题、说明、鉴权、接口数、在线调用数、SDK 状态和当前 API 上下文。
- `API-002`：切换“调用目标”，确认方法/路径、参数表单、完整接口文档链接和代码片段同步更新。
- `ENDPOINT-001`：七天内遍历全部 Endpoint，检查 SSR 语义内容、请求/响应、参数约束、示例、面包屑与兄弟导航。
- `SCHEMA-001`：七天内遍历全部 Schema，检查属性、必填/可选、enum、约束、嵌套引用和长类型名在桌面/移动端的布局。
- `PLAY-001`：`proxyEnabled=true` 且无鉴权的只读接口，使用示例值真实调用；校验请求 URL、状态码、耗时、响应和失败说明。
- `PLAY-002`：`proxyEnabled=false` 的 Endpoint 不得伪装成可执行，但所属 API 仍必须有另一条可真实调试成功的金丝雀；整组 API 只有预览能力时记为 FAIL。
- `PLAY-003`：API Key 金丝雀从安全环境向 session-only 输入注入凭据并完成只读真实调用；未配置凭据记为 BLOCKED，不输出 key。
- `PLAY-004`：OAuth 金丝雀优先复用安全环境中的 canary access token 完成只读真实调用；另行轮换验证授权/回调体验，绝不在日志中记录 token。
- `PLAY-005`：POST/PUT/PATCH/DELETE 等潜在写入接口只验证参数、预览和明确的变更确认边界，禁止执行。
- `CODE-001`：对已发布 SDK 的代表接口切换并检查 cURL、TypeScript SDK、Pontx Hub CLI 三种代码；参数必须与当前表单一致且代码非空。

### SDK、Agent Skill、国际化、SEO 与错误状态

- `SDK-001`：已发布 SDK 页面检查包名、版本、安装/调用示例、Endpoint 导航、双语页面和可索引元数据。
- `SDK-002`：计划中 SDK 页面检查明确状态且 `robots=noindex,follow`，不得出现在 sitemap。
- `SKILL-001`：中英文 Agent Skill 页面检查安装、使用、能力边界、下载/复制入口和自引用 canonical。
- `I18N-001`：对目录、API、Endpoint、Schema、SDK、Agent Skill、搜索逐类检查中英文；切换语言必须保留当前资源、查询与 fragment。
- `SEO-001`：逐个 sitemap URL 验证 200、唯一 H1、非空 title/description、绝对自引用 canonical、正确 `html lang` 和 `zh-CN`/`en`/`x-default` reciprocal alternate。
- `SEO-002`：验证 sitemap 只含 canonical 200 页面；搜索、OAuth 回调、Playground 状态、计划中 SDK 和其他临时页面均 noindex 且不入 sitemap。
- `ERROR-001`：不存在的本地化路径返回 404 恢复页，提供返回目录入口且不误设 canonical。
- `ERROR-002`：上游 4xx/5xx、超时和网络失败必须显示真实状态与可操作说明，不应统一伪装为 500。
- `ERROR-003`：加载、空数据、部分数据与重试状态可理解、可恢复且不破坏导航。

### 响应式与可访问性

- `RESPONSIVE-001`：390×844 检查目录、每个 API 概览、代表 Endpoint/Schema、SDK、搜索、Agent Skill 和 404；正文不得产生文档级横向滚动。
- `RESPONSIVE-002`：768×900 检查搜索长路径、Schema 长引用、导航折叠和内容双栏断点。
- `RESPONSIVE-003`：1440×1000 检查信息密度、侧栏、代码区、长路径和完整导航。
- `A11Y-001`：仅用键盘完成主导航、搜索、API 选择、选项卡和代码场景切换；检查可见焦点、语义名称和合理顺序。
- `A11Y-002`：检查一个描述性 H1、landmark、表单 label、按钮/链接名称、tab/combobox 状态，以及中英文长文案下的可读性。

## 已确认问题的固定回归旅程

- `REG-FRANKFURTER-V2-001`：打开 `/zh/apis/frankfurter-v2`，默认快速调用不得同时提交互斥的 `date` 与 `from/to/group` 参数；主 CTA 应直接成功或要求用户选择合法模式。
- `REG-PREVIEW-ONLY-001`：打开 Stooq 与 Yahoo Finance 概览，在线调用标记为“仅预览”时不应出现可用的“执行请求”，也不应返回通用 500。
- `REG-SCHEMA-LONG-REF-001`：在 390px 打开 CNBC `FormattedQuoteResponse`，`ExtendedMarketQuote` 等长引用必须在容器内换行或收缩，页面宽度不得超过视口。
- `REG-SEARCH-LONG-PATH-001`：在 768px 和 1440px 搜索 `exchange rate`，Massive 的长 Endpoint 路径必须在结果卡片内换行或裁剪，不得扩大文档宽度。
- `REG-API-EXECUTABLE-CANARY-001`：Stooq 与 Yahoo Finance 必须分别至少有一个金丝雀 Endpoint 从搜索进入文档后真实返回 2xx；“仅预览”不再满足核心体验。
- `REG-I3-DEBUG-STABILITY-001`：i3Investor `getSgxStockOverviewPage` 必须首次调试即返回 2xx，不能依赖重试。

## 七天滚动覆盖

每天从 sitemap 顺序、API slug 和日期生成稳定分片，保证七天内覆盖全部 Endpoint 与 Schema；同时轮换以下压力数据：无结果、超长路径、超长 Schema 引用、大段 JSON、特殊字符、慢响应、上游 4xx/5xx、英文长文案和移动端菜单。新增 API 或页面在发现当天加入每日代表旅程，并在七天内完成一次全量资源覆盖。

每次运行结束后，在 `issues.md` 写明：结构检查数量、用户旅程数量、真实调用/跳过原因、浏览器与视口、控制台错误、覆盖缺口、新增/仍存在/已恢复问题，以及本文件是否因站点变化而更新。
