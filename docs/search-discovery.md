# 搜索引擎发现与验证

Pontx Hub 将所有公开可索引 URL 放在 `https://pontx.dev/sitemap.xml`，该索引会分片列出双语 API、Endpoint、Schema、已发布 SDK、文档与 Agent Skill 页面。`robots.txt` 也引用同一 sitemap；搜索页、账号页、回调页和 API 资源不会进入 sitemap。

## Bing

`BING_SITE_VERIFICATION` 会输出 Bing 的 `msvalidate.01` 页面验证 meta。生产站点已配置此验证值。每次 metadata main 部署后，Bing Webmaster Tools 应检查 sitemap 处理状态、抓取错误、URL Inspection 与 IndexNow 接收情况。

Hub 在根路径的 `/{IndexNow key}.txt` 托管 IndexNow 主机验证 key，并且由 metadata Production 发布工作流仅提交本次变更的公开 URL。不要为未变化的全量历史页面反复提交；IndexNow 负责通知更新，并不保证收录或排名。

## 百度

`BAIDU_SITE_VERIFICATION` 会输出百度站长平台需要的 `baidu-site-verification` meta。当前生产环境尚未配置该值，必须由有百度搜索资源平台权限的运营者完成：

1. 在百度搜索资源平台为 `https://pontx.dev` 获取 HTML meta 验证值。
2. 将该值设置为 Vercel Production 的 `BAIDU_SITE_VERIFICATION`，再触发一次 Production 部署。
3. 在平台完成验证，提交 `https://pontx.dev/sitemap.xml`，并在 Day 1/7/14/28 记录抓取、索引和异常。

验证 token 本身不是应用代码常量，也不应提交到 Git。
