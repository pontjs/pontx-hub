# 产品事件与流量判读

Pontx Hub 只在配置 `GOOGLE_ANALYTICS_ID` 后加载 GA4。页面浏览和下列事件均不发送搜索词、URL query、代码内容、请求/响应体、错误文本或认证信息。

| Event | 用途 | 参数 |
| --- | --- | --- |
| `catalog_search_viewed` | 搜索结果是否有供给 | `locale`, `query_length_bucket`, `result_count_bucket` |
| `search_result_opened` | 搜索结果的点击质量 | `locale`, `resource_kind`, `api_slug`, `operation_slug` (Endpoint only), `match_mode` |
| `catalog_resource_opened` | 目录卡片的 API/SDK 引导 | `locale`, `api_slug`, `target` |
| `code_copied` | SDK、CLI 与 Skill 的接入意图 | `surface`, `code_kind`, `api_slug` when applicable |
| `sdk_npm_opened` | 进入 npm 包页的意图 | `locale`, `api_slug` |
| `playground_request` | Playground 漏斗 | `api_slug`, `operation_slug`, `request_mode`, `outcome`, `blocker` when blocked |

在 GA4 中将需要报表细分的参数注册为事件范围的自定义维度；不要将搜索词或用户输入注册为维度。

## 排除团队测试流量

团队成员在同一浏览器首次测试生产站时访问：

```text
https://pontx.dev/zh?pontx_internal=1
```

该命令会在浏览器本地保存内部流量标记并立刻从地址栏移除。之后页面浏览会携带 `traffic_type=internal`，但不会携带上述 URL 参数。停止标记可访问：

```text
https://pontx.dev/zh?pontx_internal=0
```

在 GA4 的 **Admin → Data filters** 创建 Internal traffic 过滤器，先选择 **Testing**，确认事件被标记后才改为 **Active**。Active 是永久排除且不会追溯修改历史数据。
