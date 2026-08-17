import type { SearchEvaluationCase } from "./search-evaluation";

// Human-reviewed relevance judgments. Keep query wording independent from
// catalog titles so this set measures retrieval, not string duplication.
export const searchEvaluationCases: SearchEvaluationCase[] = [
  {
    id: "zh-create-todo",
    query: "新增一条待办事项",
    locale: "zh",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:dida365/create-task", relevance: 3 }],
    requiredTopK: 1,
    tags: ["zh", "semantic", "endpoint"]
  },
  {
    id: "en-finish-task",
    query: "mark a todo as done",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:dida365/complete-task", relevance: 3 }],
    tags: ["en", "semantic", "endpoint"]
  },
  {
    id: "zh-delete-project",
    query: "移除一个项目",
    locale: "zh",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:dida365/delete-project", relevance: 3 }],
    tags: ["zh", "semantic", "endpoint"]
  },
  {
    id: "en-project-list",
    query: "show all my projects",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:dida365/get-user-projects", relevance: 3 }],
    tags: ["en", "intent", "endpoint"]
  },
  {
    id: "zh-task-input",
    query: "创建任务需要哪些入参",
    locale: "zh",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:dida365/create-task", relevance: 3 }],
    requiredTopK: 1,
    tags: ["zh", "request", "schema-graph"]
  },
  {
    id: "zh-task-output-field",
    query: "哪个接口返回 dueDate",
    locale: "zh",
    kinds: ["endpoint"],
    judgments: [
      { id: "endpoint:dida365/get-task-by-project-id-and-task-id", relevance: 3 },
      { id: "endpoint:dida365/create-task", relevance: 2 },
      { id: "endpoint:dida365/update-task", relevance: 2 }
    ],
    tags: ["zh", "response", "property"]
  },
  {
    id: "exact-operation-id",
    query: "getHistoricalRates",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [
      { id: "endpoint:currencybeacon-rest/get-historical-rates", relevance: 3 },
      { id: "endpoint:frankfurter/get-historical-rates", relevance: 3 }
    ],
    requiredTopK: 1,
    tags: ["en", "exact", "operation-id"]
  },
  {
    id: "exact-schema",
    query: "TaskCreate",
    locale: "en",
    kinds: ["schema"],
    judgments: [{ id: "schema:dida365/TaskCreate", relevance: 3 }],
    requiredTopK: 1,
    tags: ["en", "exact", "schema"]
  },
  {
    id: "schema-property",
    query: "projectId",
    locale: "en",
    kinds: ["schema"],
    judgments: [
      { id: "schema:dida365/TaskCreate", relevance: 3 },
      { id: "schema:dida365/Task", relevance: 2 },
      { id: "schema:dida365/TaskUpdate", relevance: 2 }
    ],
    tags: ["en", "property", "schema"]
  },
  {
    id: "zh-currency-conversion",
    query: "把欧元换成美元",
    locale: "zh",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:currencybeacon-rest/convert-currency", relevance: 3 }],
    tags: ["zh", "semantic", "currency"]
  },
  {
    id: "en-currency-list",
    query: "which currencies are supported",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [
      { id: "endpoint:currencybeacon-rest/list-currencies", relevance: 3 },
      { id: "endpoint:frankfurter/get-currencies", relevance: 3 }
    ],
    requiredTopK: 1,
    tags: ["en", "currency", "endpoint"]
  },
  {
    id: "zh-exchange-history",
    query: "查询过去某一天的汇率",
    locale: "zh",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:frankfurter/get-historical-rates", relevance: 3 }],
    tags: ["zh", "currency", "temporal"]
  },
  {
    id: "en-rate-series",
    query: "exchange rates over a date range",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:frankfurter/get-time-series-rates", relevance: 3 }],
    tags: ["en", "currency", "temporal"]
  },
  {
    id: "en-symbol-search",
    query: "find a security by ticker symbol",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:massive/list-tickers", relevance: 3 }],
    tags: ["en", "finance", "ambiguous"]
  },
  {
    id: "en-last-trade",
    query: "most recent stock trade",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:massive/get-last-trade", relevance: 3 }],
    tags: ["en", "finance", "trade"]
  },
  {
    id: "en-previous-stock-close",
    query: "yesterday's closing stock price",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:massive/get-previous-close", relevance: 3 }],
    tags: ["en", "finance", "aggregate"]
  },
  {
    id: "zh-browser-screenshot-issue",
    query: "网页问题截图创建缺陷",
    locale: "zh",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:pinhere/create-issue", relevance: 3 }],
    requiredTopK: 1,
    requiresProducts: ["pinhere"],
    tags: ["zh", "semantic", "browser-extension", "issue"]
  },
  {
    id: "en-browser-screenshot-issue",
    query: "browser extension screenshot issue triage",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:pinhere/create-issue", relevance: 3 }],
    requiredTopK: 1,
    requiresProducts: ["pinhere"],
    tags: ["en", "semantic", "browser-extension", "issue"]
  },
  {
    id: "api-product",
    query: "task productivity service",
    locale: "en",
    kinds: ["api"],
    judgments: [
      { id: "api:dida365", relevance: 3 },
      { id: "api:wps-365", relevance: 3 }
    ],
    requiredTopK: 1,
    tags: ["en", "api", "product"]
  },
  {
    id: "en-public-holidays-by-country",
    query: "public holidays for a country in 2026",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:nager-date/list-holidays-by-year", relevance: 3 }],
    requiredTopK: 1,
    requiresProducts: ["nager-date"],
    tags: ["en", "holidays", "temporal", "endpoint"]
  },
  {
    id: "zh-public-holidays-by-country",
    query: "查询某个国家 2026 年的公共节假日",
    locale: "zh",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:nager-date/list-holidays-by-year", relevance: 3 }],
    requiredTopK: 1,
    requiresProducts: ["nager-date"],
    tags: ["zh", "holidays", "temporal", "endpoint"]
  },
  {
    id: "zh-notion-workspace-pages",
    query: "查询工作区里的页面和数据库",
    locale: "zh",
    kinds: ["api"],
    judgments: [{ id: "api:notion", relevance: 3 }],
    requiredTopK: 1,
    requiresProducts: ["notion"],
    tags: ["zh", "api", "product"]
  },
  {
    id: "en-notion-list-pages",
    query: "list pages in my workspace database",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:notion/list-views", relevance: 3 }, { id: "endpoint:notion/query-data-source", relevance: 2 }],
    requiredTopK: 1,
    requiresProducts: ["notion"],
    tags: ["en", "semantic", "endpoint"]
  },
  {
    id: "zh-notion-create-page",
    query: "创建页面并添加内容",
    locale: "zh",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:notion/post-page", relevance: 3 }],
    requiredTopK: 1,
    requiresProducts: ["notion"],
    tags: ["zh", "mutation", "endpoint"]
  },
  {
    id: "mistral-en-generate-embeddings",
    query: "generate embeddings for a piece of text",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:mistral-ai/embeddings-v1-embeddings-post", relevance: 3 }],
    requiredTopK: 5,
    requiresProducts: ["mistral-ai"],
    tags: ["en", "semantic", "endpoint"]
  },
  {
    id: "mistral-zh-model-list",
    query: "模型列表",
    locale: "zh",
    kinds: ["schema"],
    judgments: [{ id: "schema:mistral-ai/ModelList", relevance: 3 }],
    requiredTopK: 1,
    requiresProducts: ["mistral-ai"],
    tags: ["zh", "semantic", "schema"]
  },
  {
    id: "mistral-en-chat-completion",
    query: "what fields are in a chat completion response",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:mistral-ai/chat-completion-v1-chat-completions-post", relevance: 3 }],
    requiredTopK: 1,
    requiresProducts: ["mistral-ai"],
    tags: ["en", "semantic", "endpoint"]
  }
];

export function selectSearchEvaluationCases(productSlugs: Iterable<string>): SearchEvaluationCase[] {
  const availableProducts = new Set(productSlugs);
  return searchEvaluationCases.filter((evaluationCase) =>
    evaluationCase.requiresProducts?.every((slug) => availableProducts.has(slug)) ?? true
  );
}
