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
    judgments: [{ id: "endpoint:frankfurter/get-historical-rates", relevance: 3 }],
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
    judgments: [{ id: "endpoint:frankfurter/get-latest-rates", relevance: 3 }],
    tags: ["zh", "semantic", "currency"]
  },
  {
    id: "en-currency-list",
    query: "which currencies are supported",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:frankfurter/get-currencies", relevance: 3 }],
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
    id: "zh-a-share-kline",
    query: "获取 A 股 K 线",
    locale: "zh",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:sina-finance/get-kline-data", relevance: 3 }],
    tags: ["zh", "finance", "disambiguation"]
  },
  {
    id: "zh-adjusted-kline",
    query: "前复权 K 线数据",
    locale: "zh",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:tencent-finance/get-forward-adjusted-kline", relevance: 3 }],
    requiredTopK: 1,
    tags: ["zh", "finance", "disambiguation"]
  },
  {
    id: "en-historical-csv",
    query: "download historical stock prices",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:stooq/download-historical-quotes", relevance: 3 }],
    tags: ["en", "finance", "download"]
  },
  {
    id: "zh-fund-nav",
    query: "基金历史净值列表",
    locale: "zh",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:eastmoney-funds/list-historical-nav", relevance: 3 }],
    requiredTopK: 1,
    tags: ["zh", "finance", "fund"]
  },
  {
    id: "zh-fund-estimate",
    query: "查看基金实时估值",
    locale: "zh",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:eastmoney-funds/get-fund-estimate", relevance: 3 }],
    tags: ["zh", "finance", "fund"]
  },
  {
    id: "en-symbol-search",
    query: "find a security by ticker symbol",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [
      { id: "endpoint:yahoo-finance/search-symbols", relevance: 3 },
      { id: "endpoint:massive/list-tickers", relevance: 2 }
    ],
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
    id: "zh-sgx-overview",
    query: "新加坡股票概览页",
    locale: "zh",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:i3investor-sgx/get-sgx-stock-overview-page", relevance: 3 }],
    tags: ["zh", "finance", "sgx"]
  },
  {
    id: "en-cnbc-chart",
    query: "CNBC quote chart",
    locale: "en",
    kinds: ["endpoint"],
    judgments: [{ id: "endpoint:cnbc-market-data/get-quote-chart-data", relevance: 3 }],
    requiredTopK: 1,
    tags: ["en", "finance", "provider"]
  },
  {
    id: "api-product",
    query: "task productivity service",
    locale: "en",
    kinds: ["api"],
    judgments: [{ id: "api:dida365", relevance: 3 }],
    requiredTopK: 1,
    tags: ["en", "api", "product"]
  },
  {
    id: "zh-api-provider",
    query: "新浪财经服务",
    locale: "zh",
    kinds: ["api"],
    judgments: [{ id: "api:sina-finance", relevance: 3 }],
    requiredTopK: 1,
    tags: ["zh", "api", "provider"]
  }
];
