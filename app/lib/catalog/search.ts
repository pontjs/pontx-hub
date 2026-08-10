import type {
  CatalogApi,
  CatalogPayloadMetadata,
  GlobalSearchKind,
  GlobalSearchMatch,
  GlobalSearchMatchField,
  GlobalSearchResponse,
  GlobalSearchResult,
  Locale
} from "./types";
import { localize } from "./types";

type WeightedField = {
  value: string | undefined;
  weight: number;
  field: GlobalSearchMatchField;
};

type ScoredMatch = {
  score: number;
  match: GlobalSearchMatch;
};

const kindOrder: Record<GlobalSearchKind, number> = {
  api: 0,
  endpoint: 1,
  schema: 2
};

const matchFieldOrder: GlobalSearchMatchField[] = [
  "title",
  "request",
  "response",
  "parameter",
  "property",
  "schema",
  "description",
  "product",
  "path"
];

// Small, deterministic bilingual ontology for API intent/entity retrieval. It
// complements exact metadata matching without introducing a runtime AI key.
const semanticConcepts: string[][] = [
  ["create", "add", "new", "insert", "post", "创建", "新建", "新增", "添加"],
  ["read", "get", "fetch", "retrieve", "find", "query", "search", "detail", "查询", "搜索", "获取", "查看", "读取", "详情"],
  ["list", "all", "collection", "browse", "列表", "全部", "集合", "浏览"],
  ["update", "edit", "modify", "change", "patch", "put", "更新", "编辑", "修改", "变更"],
  ["delete", "remove", "destroy", "删除", "移除"],
  ["complete", "finish", "done", "完成", "办结"],
  ["task", "todo", "item", "任务", "待办", "事项"],
  ["project", "workspace", "folder", "项目", "清单", "工作区"],
  ["currency", "exchange", "rate", "forex", "convert", "conversion", "price", "汇率", "换汇", "换算", "换成", "转换", "兑换", "外汇", "币种", "货币", "价格"],
  ["date", "time", "deadline", "due", "schedule", "日期", "时间", "截止", "到期", "日程"],
  ["priority", "importance", "urgent", "优先级", "重要", "紧急"],
  ["request", "input", "payload", "body", "parameter", "argument", "请求", "入参", "输入", "请求体", "参数"],
  ["response", "output", "result", "return", "returns", "响应", "出参", "输出", "返回", "结果"],
  ["schema", "model", "structure", "type", "field", "property", "数据结构", "模型", "结构", "类型", "字段", "属性"],
  ["auth", "authentication", "token", "credential", "鉴权", "认证", "令牌", "凭证"],
  ["stock", "security", "ticker", "symbol", "share", "equity", "股票", "证券", "标的", "代码", "股"],
  ["quote", "price", "snapshot", "market", "行情", "报价", "快照"],
  ["trade", "transaction", "成交", "交易"],
  ["chart", "kline", "candlestick", "bar", "bars", "图表", "k 线", "k线"],
  ["adjusted", "adjustment", "forward adjusted", "前复权"],
  ["historical", "history", "past", "previous", "历史", "过去", "前一"],
  ["fund", "funds", "基金"],
  ["nav", "net asset value", "净值"],
  ["estimate", "estimated", "valuation", "估值", "预估"],
  ["download", "export", "csv", "下载", "导出"],
  ["singapore", "sgx", "新加坡", "新交所"],
  ["product", "provider", "service", "platform", "产品", "服务商", "服务", "平台"]
];

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "api",
  "for",
  "in",
  "of",
  "please",
  "my",
  "the",
  "to",
  "with",
  "which",
  "一个",
  "一下",
  "中的",
  "以及",
  "可以",
  "帮我",
  "接口",
  "相关",
  "这个"
]);

const endpointIntentTerms = [
  ...semanticConcepts.slice(0, 6).flat(),
  "convert",
  "conversion",
  "换算",
  "转换",
  "request",
  "input",
  "payload",
  "response",
  "output",
  "return",
  "请求",
  "入参",
  "响应",
  "出参",
  "返回"
];

const schemaIntentTerms = [
  "schema",
  "model",
  "structure",
  "type",
  "field",
  "property",
  "数据结构",
  "模型",
  "结构",
  "类型",
  "字段",
  "属性"
];

const productIntentTerms = [
  "product",
  "provider",
  "service",
  "platform",
  "产品",
  "服务商",
  "服务",
  "平台"
];

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLocaleLowerCase()
    .replace(/[_\-/]+/g, " ")
    .replace(/[^\p{L}\p{N}.]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function termMatches(value: string, term: string): boolean {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return false;
  if (/\p{Script=Han}/u.test(normalizedTerm)) {
    return value.includes(normalizedTerm);
  }
  return ` ${value} `.includes(` ${normalizedTerm} `);
}

function queryMatchesAny(query: string, terms: string[]): boolean {
  const normalizedQuery = normalize(query);
  return terms.some((term) => termMatches(normalizedQuery, term));
}

function resourceIntentBoost(query: string, kind: GlobalSearchKind): number {
  if (kind === "endpoint" && queryMatchesAny(query, endpointIntentTerms)) return 100;
  if (kind === "schema" && queryMatchesAny(query, schemaIntentTerms)) return 120;
  if (kind === "api" && queryMatchesAny(query, productIntentTerms)) return 120;
  return 0;
}

function queryTokens(query: string): string[] {
  return [...new Set(normalize(query).split(" "))].filter(
    (token) => token.length > 1 && !stopWords.has(token)
  );
}

function longestHanOverlap(left: string, right: string): number {
  const leftSegments = left.match(/\p{Script=Han}+/gu) ?? [];
  const rightSegments = right.match(/\p{Script=Han}+/gu) ?? [];
  let longest = 0;
  for (const leftSegment of leftSegments) {
    for (const rightSegment of rightSegments) {
      let previous = new Array<number>(rightSegment.length + 1).fill(0);
      for (const leftCharacter of leftSegment) {
        const current = new Array<number>(rightSegment.length + 1).fill(0);
        for (let index = 0; index < rightSegment.length; index++) {
          if (leftCharacter === rightSegment[index]) {
            current[index + 1] = previous[index] + 1;
            longest = Math.max(longest, current[index + 1]);
          }
        }
        previous = current;
      }
    }
  }
  return longest;
}

function normalizedSearchFields(fields: WeightedField[]) {
  const unique = new Map<string, WeightedField & { value: string }>();
  for (const field of fields) {
    const value = normalize(field.value ?? "");
    if (!value) continue;
    const key = `${field.field}:${value}`;
    const current = unique.get(key);
    if (!current || current.weight < field.weight) {
      unique.set(key, { ...field, value });
    }
  }
  return [...unique.values()];
}

function exactIdentityBoost(query: string, values: Array<string | undefined>) {
  const normalizedQuery = normalize(query);
  return values.some((value) => normalize(value ?? "") === normalizedQuery)
    ? 500
    : 0;
}

function lexicalRelevance(query: string, fields: WeightedField[]) {
  const normalizedQuery = normalize(query);
  const tokens = queryTokens(query);
  const normalizedFields = normalizedSearchFields(fields);
  const matchedFields = new Set<GlobalSearchMatchField>();
  const matchedTokens = new Set<string>();
  const tokenScores = new Map<string, number>();
  let phraseScore = 0;
  let phraseMatched = false;

  for (const field of normalizedFields) {
    if (field.value === normalizedQuery) {
      phraseScore = Math.max(phraseScore, field.weight * 12);
      phraseMatched = true;
      matchedFields.add(field.field);
    } else if (field.value.startsWith(normalizedQuery)) {
      phraseScore = Math.max(phraseScore, field.weight * 8);
      phraseMatched = true;
      matchedFields.add(field.field);
    } else if (normalizedQuery && field.value.includes(normalizedQuery)) {
      phraseScore = Math.max(phraseScore, field.weight * 5);
      phraseMatched = true;
      matchedFields.add(field.field);
    } else if (
      field.value.length >= (field.field === "product" ? 3 : 5) &&
      normalizedQuery.includes(field.value)
    ) {
      // Natural-language queries often wrap an exact provider, identifier, or
      // title in extra words (for example “新浪财经服务”).
      phraseScore = Math.max(phraseScore, field.weight * 4);
      phraseMatched = true;
      matchedFields.add(field.field);
    } else {
      const hanOverlap = longestHanOverlap(normalizedQuery, field.value);
      if (hanOverlap >= 3) {
        phraseScore = Math.max(
          phraseScore,
          field.weight * Math.min(hanOverlap, 4)
        );
        phraseMatched = true;
        matchedFields.add(field.field);
      }
    }

    for (const token of tokens) {
      if (!termMatches(field.value, token)) continue;
      matchedTokens.add(token);
      matchedFields.add(field.field);
      tokenScores.set(token, Math.max(tokenScores.get(token) ?? 0, field.weight));
    }
  }

  const minimumTokens = Math.max(1, Math.ceil(tokens.length * 0.6));
  if (!phraseMatched && (!tokens.length || matchedTokens.size < minimumTokens)) {
    return { score: 0, fields: new Set<GlobalSearchMatchField>() };
  }

  const score =
    phraseScore +
    [...tokenScores.values()].reduce((total, value) => total + value, 0) +
    (matchedTokens.size
      ? (matchedTokens.size / Math.max(tokens.length, 1)) * 12
      : 0);
  return { score, fields: matchedFields };
}

function semanticRelevance(query: string, fields: WeightedField[]) {
  const normalizedQuery = normalize(query);
  const concepts = semanticConcepts.filter((terms) =>
    terms.some((term) => termMatches(normalizedQuery, term))
  );
  if (!concepts.length) {
    return { score: 0, fields: new Set<GlobalSearchMatchField>() };
  }

  const normalizedFields = normalizedSearchFields(fields);
  const matchedFields = new Set<GlobalSearchMatchField>();
  let score = 0;
  let matchedConcepts = 0;

  for (const concept of concepts) {
    let best: (WeightedField & { value: string }) | undefined;
    for (const field of normalizedFields) {
      if (!concept.some((term) => termMatches(field.value, term))) continue;
      matchedFields.add(field.field);
      if (!best || field.weight > best.weight) best = field;
    }
    if (!best) continue;
    matchedConcepts++;
    const fieldTokenCount = best.value.split(" ").length;
    score += best.weight * 5 + Math.max(0, 6 - fieldTokenCount);
  }

  const minimumConcepts = Math.max(1, Math.ceil(concepts.length * 0.6));
  if (matchedConcepts < minimumConcepts) {
    return { score: 0, fields: new Set<GlobalSearchMatchField>() };
  }
  score += (matchedConcepts / concepts.length) * 20;
  return { score, fields: matchedFields };
}

function relevance(query: string, fields: WeightedField[]): ScoredMatch {
  const lexical = lexicalRelevance(query, fields);
  const semantic = semanticRelevance(query, fields);
  const score =
    lexical.score +
    semantic.score +
    (lexical.score > 0 && semantic.score > 0 ? 50 : 0);
  const matchedFields = new Set([...lexical.fields, ...semantic.fields]);
  return {
    score,
    match: {
      mode:
        lexical.score > 0 && semantic.score > 0
          ? "hybrid"
          : semantic.score > 0
            ? "semantic"
            : "lexical",
      fields: matchFieldOrder.filter((field) => matchedFields.has(field))
    }
  };
}

function localizedFields(
  zh: string | undefined,
  en: string | undefined,
  weight: number,
  field: GlobalSearchMatchField
): WeightedField[] {
  return [
    { value: zh, weight, field },
    { value: en, weight, field }
  ];
}

function productFields(api: CatalogApi, weight = 4): WeightedField[] {
  return [
    { value: api.slug, weight: weight + 2, field: "product" },
    { value: api.name, weight: weight + 2, field: "product" },
    { value: api.provider, weight: weight + 1, field: "product" },
    { value: api.category, weight, field: "product" },
    ...localizedFields(api.title.zh, api.title.en, weight + 2, "product"),
    ...localizedFields(api.summary.zh, api.summary.en, weight, "product")
  ];
}

function schemaGraphFields(
  api: CatalogApi,
  schemaName: string | undefined,
  field: "parameter" | "request" | "response",
  weight: number,
  visited = new Set<string>()
): WeightedField[] {
  if (!schemaName || visited.has(schemaName) || visited.size >= 8) return [];
  visited.add(schemaName);
  const schema = api.schemas.find((candidate) => candidate.name === schemaName);
  if (!schema) return [];

  return [
    { value: schema.name, weight: weight + 2, field },
    ...localizedFields(schema.title.zh, schema.title.en, weight + 1, field),
    ...localizedFields(schema.description.zh, schema.description.en, weight, field),
    ...schema.properties.flatMap((property) => [
      { value: property.name, weight: weight + 1, field },
      { value: property.ref, weight, field },
      ...localizedFields(
        property.description?.zh,
        property.description?.en,
        weight,
        field
      ),
      ...schemaGraphFields(api, property.ref, field, Math.max(weight - 1, 1), visited)
    ])
  ];
}

function payloadFields(
  api: CatalogApi,
  payload: CatalogPayloadMetadata | undefined,
  field: "request" | "response",
  weight: number
): WeightedField[] {
  if (!payload) return [];
  const role =
    field === "request"
      ? "request input payload body parameter 请求 入参 输入 请求体 参数"
      : "response output result return 响应 出参 输出 返回 结果";
  return [
    { value: role, weight, field },
    { value: payload.schemaName, weight: weight + 3, field },
    { value: payload.schemaType, weight, field },
    { value: payload.contentTypes?.join(" "), weight: 2, field },
    { value: payload.properties?.join(" "), weight: weight + 1, field },
    ...localizedFields(
      payload.description?.zh,
      payload.description?.en,
      weight,
      field
    ),
    ...schemaGraphFields(api, payload.schemaName, field, weight)
  ];
}

export function buildSearchResponse(
  catalog: CatalogApi[],
  query: string,
  locale: Locale,
  options: {
    kinds?: GlobalSearchKind[];
    limit?: number;
    offset?: number;
  } = {}
): GlobalSearchResponse {
  const normalizedQuery = query.trim();
  const kinds = new Set<GlobalSearchKind>(
    options.kinds?.length ? options.kinds : ["api", "endpoint", "schema"]
  );
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const results: GlobalSearchResult[] = [];

  if (normalizedQuery) {
    for (const api of catalog) {
      const apiTitle = localize(api.title, locale);
      const apiMatch = relevance(normalizedQuery, [
        { value: "product provider service platform 产品 服务商 服务 平台", weight: 2, field: "product" },
        { value: api.slug, weight: 12, field: "product" },
        { value: api.name, weight: 12, field: "product" },
        { value: api.provider, weight: 10, field: "product" },
        { value: api.category, weight: 5, field: "product" },
        ...localizedFields(api.title.zh, api.title.en, 12, "title"),
        ...localizedFields(api.summary.zh, api.summary.en, 6, "description")
      ]);
      apiMatch.score += exactIdentityBoost(normalizedQuery, [
        api.slug,
        api.name,
        api.title.zh,
        api.title.en
      ]);
      if (apiMatch.score > 0) {
        apiMatch.score += resourceIntentBoost(normalizedQuery, "api");
      }
      if (kinds.has("api") && apiMatch.score > 0) {
        results.push({
          id: `api:${api.slug}`,
          kind: "api",
          score: apiMatch.score,
          match: apiMatch.match,
          apiSlug: api.slug,
          apiTitle,
          provider: api.provider,
          title: apiTitle,
          description: localize(api.summary, locale),
          href: `/${locale}/apis/${api.slug}`,
          category: api.category,
          endpointCount: api.operations.length,
          schemaCount: api.schemas.length
        });
      }

      if (kinds.has("endpoint")) {
        for (const operation of api.operations) {
          const endpointMatch = relevance(normalizedQuery, [
            ...productFields(api),
            { value: operation.operationId, weight: 14, field: "title" },
            { value: operation.slug, weight: 12, field: "title" },
            { value: operation.path, weight: 12, field: "path" },
            { value: operation.method, weight: 8, field: "path" },
            { value: operation.tag, weight: 6, field: "title" },
            ...localizedFields(operation.title.zh, operation.title.en, 14, "title"),
            ...localizedFields(
              operation.description.zh,
              operation.description.en,
              6,
              "description"
            ),
            ...operation.parameters.flatMap((parameter) => [
              { value: parameter.name, weight: 9, field: "parameter" as const },
              { value: parameter.in, weight: 3, field: "parameter" as const },
              { value: parameter.type, weight: 3, field: "parameter" as const },
              { value: parameter.format, weight: 3, field: "parameter" as const },
              { value: parameter.schemaName, weight: 8, field: "parameter" as const },
              { value: parameter.enum?.join(" "), weight: 4, field: "parameter" as const },
              ...localizedFields(
                parameter.description?.zh,
                parameter.description?.en,
                5,
                "parameter"
              ),
              ...schemaGraphFields(api, parameter.schemaName, "parameter", 5)
            ]),
            ...payloadFields(api, operation.requestBody, "request", 7),
            ...operation.responses.flatMap((response) => [
              { value: response.status, weight: 2, field: "response" as const },
              ...payloadFields(api, response, "response", 6)
            ])
          ]);
          endpointMatch.score += exactIdentityBoost(normalizedQuery, [
            operation.operationId,
            operation.slug
          ]);
          if (endpointMatch.score > 0) {
            endpointMatch.score += resourceIntentBoost(normalizedQuery, "endpoint");
          }
          if (endpointMatch.score === 0) continue;
          results.push({
            id: `endpoint:${api.slug}/${operation.slug}`,
            kind: "endpoint",
            score: endpointMatch.score,
            match: endpointMatch.match,
            apiSlug: api.slug,
            apiTitle,
            provider: api.provider,
            title: localize(operation.title, locale),
            description: localize(operation.description, locale),
            href: `/${locale}/apis/${api.slug}/${operation.slug}`,
            operationSlug: operation.slug,
            operationId: operation.operationId,
            method: operation.method,
            path: operation.path,
            tag: operation.tag
          });
        }
      }

      if (kinds.has("schema")) {
        for (const schema of api.schemas) {
          const schemaMatch = relevance(normalizedQuery, [
            ...productFields(api, 3),
            { value: schema.name, weight: 15, field: "schema" },
            ...localizedFields(schema.title.zh, schema.title.en, 14, "title"),
            ...localizedFields(schema.description.zh, schema.description.en, 6, "description"),
            ...schema.properties.flatMap((property) => [
              { value: property.name, weight: 9, field: "property" as const },
              { value: property.ref, weight: 6, field: "property" as const },
              { value: property.type, weight: 3, field: "property" as const },
              { value: property.format, weight: 3, field: "property" as const },
              ...localizedFields(
                property.description?.zh,
                property.description?.en,
                5,
                "property"
              )
            ])
          ]);
          schemaMatch.score += exactIdentityBoost(normalizedQuery, [
            schema.name,
            schema.title.zh,
            schema.title.en
          ]);
          if (schemaMatch.score > 0) {
            schemaMatch.score += resourceIntentBoost(normalizedQuery, "schema");
          }
          if (schemaMatch.score === 0) continue;
          results.push({
            id: `schema:${api.slug}/${schema.name}`,
            kind: "schema",
            score: schemaMatch.score,
            match: schemaMatch.match,
            apiSlug: api.slug,
            apiTitle,
            provider: api.provider,
            title: localize(schema.title, locale),
            description: localize(schema.description, locale),
            href: `/${locale}/apis/${api.slug}/schemas/${encodeURIComponent(schema.name)}`,
            schemaName: schema.name,
            schemaType: schema.type,
            propertyCount: schema.properties.length,
            properties: schema.properties.map((property) => property.name)
          });
        }
      }
    }
  }

  results.sort((left, right) => {
    if (left.score !== right.score) return right.score - left.score;
    if (left.kind !== right.kind) return kindOrder[left.kind] - kindOrder[right.kind];
    return left.id.localeCompare(right.id);
  });

  const counts: Record<GlobalSearchKind, number> = {
    api: results.filter((result) => result.kind === "api").length,
    endpoint: results.filter((result) => result.kind === "endpoint").length,
    schema: results.filter((result) => result.kind === "schema").length
  };

  return {
    strategy: "hybrid-semantic",
    semanticVersion: "pontx-multilingual-v1",
    query: normalizedQuery,
    locale,
    total: results.length,
    offset,
    limit,
    counts,
    items: results.slice(offset, offset + limit)
  };
}
