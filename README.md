# Pontx Hub

Curated, agent-ready OpenAPI documentation and TypeScript/Node.js SDK portal.

- Production: [pontx.dev](https://pontx.dev)
- Documentation: [English](https://pontx.dev/en/docs) · [中文](https://pontx.dev/zh/docs)
- Source: [pontjs/pontx-hub](https://github.com/pontjs/pontx-hub)
- API metadata: [pontjs/pontx-api-metadata](https://github.com/pontjs/pontx-api-metadata)
- Hub CLI: [pontjs/pontx-hub-cli](https://github.com/pontjs/pontx-hub-cli)
- Contributions: [CONTRIBUTING.md](./CONTRIBUTING.md)

## Development

```bash
pnpm install
pnpm dev
```

Set `GOOGLE_ANALYTICS_ID` to a GA4 web data stream Measurement ID (for example,
`G-XXXXXXXXXX`) to enable page-view analytics. When the variable is unset,
Google Analytics is not loaded.

`PONTX_PUBLIC_SITE_ORIGIN=https://pontx.dev` is the single public origin used
for canonical URLs, hreflang, robots, sitemap, Open Graph, and structured data.
Preview deployments intentionally point those signals at the production origin.
Search ownership meta tags can be supplied with `GOOGLE_SITE_VERIFICATION`,
`BING_SITE_VERIFICATION`, and `BAIDU_SITE_VERIFICATION`.

## Optional accounts

The account foundation is disabled by default. Public catalog, documentation,
search, SDK, and Playground routes do not require an account or database.
When enabled, signed-in users can synchronize Endpoint favorites and retain their
latest 100 Playground executions for parameter replay. History excludes auth
objects, provider responses, and detected credential fields; API keys, OAuth
tokens, and passwords remain browser-session-only. An Endpoint page shows its
three most recent runs; retrying restores the sanitized inputs into Playground
and synchronizes the generated SDK/CLI examples without automatically sending
another provider request.

To enable GitHub sign-in in a configured environment, set:

```dotenv
PONTX_ACCOUNTS_ENABLED=true
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=<at-least-32-random-characters>
BETTER_AUTH_URL=https://pontx.dev
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
PONTX_AUTH_TRUSTED_ORIGINS=https://pontx.dev,https://optional-preview-origin.example
```

Register `${BETTER_AUTH_URL}/api/auth/callback/github` as the GitHub OAuth App
callback, then run `pnpm db:migrate` before enabling the feature. Do not put API
provider credentials in these variables or in the account database. GitHub
OAuth access, refresh, and ID tokens are removed before the identity mapping is
persisted. Authentication requests use Better Auth's database-backed rate
limiter, so the generated `rateLimit` table must be present before the feature
flag is enabled. See [`docs/accounts-and-favorites.md`](./docs/accounts-and-favorites.md)
for the product and security boundary.

OAuth-capable provider applications must also register
`https://pontx.dev/oauth/callback`. Existing Dida365 applications created for
the former Vercel hostname need their callback updated before authorization.

The curated source of truth lives in the separate
[`pontjs/pontx-api-metadata`](https://github.com/pontjs/pontx-api-metadata)
repository. The Hub synchronizes its compiled catalog before development,
tests, and production builds.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm search:eval
pnpm build
```

`pnpm search:eval` runs the checked-in bilingual relevance suite and fails on
quality or performance regressions. It reports Success@1, Recall@5, MRR@10,
nDCG@10, zero-result rate, required Top-K checks, mean/p95 latency, and
throughput. Add human-reviewed cases in
`app/lib/catalog/search-evaluation-cases.ts` as the catalog and query traffic
expand; do not lower thresholds to accommodate a ranking regression.

## Hub CLI and Agent Skill

The standalone [`pontx-hub-cli`](https://github.com/pontjs/pontx-hub-cli)
repository communicates only with the public Hub HTTP API. It provides one
hybrid semantic search across API products, HTTP endpoints, request parameters,
request/response schemas, and OpenAPI data structures, and
installs the universal Agent Skill without coupling Hub releases to Pontx.

The source Skill is packaged in the skills-only
[`Pontx API plugin`](./plugins/pontx-api), and is also discoverable from
[`/.well-known/skills/index.json`](https://pontx.dev/.well-known/skills/index.json),
while [`/llms.txt`](https://pontx.dev/llms.txt) provides a compact Agent-readable
map of the canonical documentation and
[`/openapi.json`](https://pontx.dev/openapi.json) describes the read-only Hub
discovery API.

```bash
pontx-hub search "exchange rate" --json
pontx-hub search "创建任务的入参" --locale zh --json
pontx-hub search "返回 dueDate 的接口" --locale zh --json
pontx-hub search projectId --type schema --json
pontx-hub show schema:dida365/TaskCreate
```

The reusable search contract is `GET /api/v2/search`. The endpoint accepts
`q`, `locale`, `types`, `limit`, and `offset`; every result includes a stable
resource ID, direct Hub URL, lexical/semantic/hybrid match mode, and the
matched metadata fields. Product metadata and the complete endpoint input /
output schema graph participate in ranking. The search is deterministic and
requires no runtime AI credential. The legacy endpoint-only
`GET /api/v1/search` remains available for older clients.
