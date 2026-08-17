# Pontx Hub

Curated, agent-ready PontxSpec API documentation and unified SDK/CLI portal.

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

## Pontx Agent

The signed-in execution agent is disabled unless its model and database backing
services are configured explicitly. It accepts Anthropic's Messages API or an
Anthropic-compatible provider without storing the model credential in Git or
the account database. For DeepSeek V4 Flash, use:

```dotenv
PONTX_AI_ENABLED=true
PONTX_AI_API_KEY=<server-side-secret>
PONTX_AI_BASE_URL=https://api.deepseek.com/anthropic
PONTX_AI_MODEL=deepseek-v4-flash
PONTX_AI_INPUT_USD_PER_MTOK=0.14
PONTX_AI_OUTPUT_USD_PER_MTOK=0.28
```

The input rate intentionally uses the cache-miss price so the global daily
budget remains conservative. Direct Anthropic deployments may continue using
`ANTHROPIC_API_KEY`; when `PONTX_AI_API_KEY` is present it takes precedence.

The curated source of truth lives in the separate
[`pontjs/pontx-api-metadata`](https://github.com/pontjs/pontx-api-metadata)
repository. The Hub first reads the small `catalog/products.json` index, then
loads every product's `product.json`, `spec.pontx.json`, `sdk.json`, and locale
files from one exact metadata commit. It validates the canonical and localized
PontxSpecs before writing untracked per-product build caches; there is no
aggregate Catalog payload, and the build consumes the declared PontxSpec
hierarchy directly.

Local development auto-discovers a sibling metadata checkout or accepts
`METADATA_REPO_LOCAL_PATH`. Remote builds must set `METADATA_REPO_COMMIT` to an
exact 40-character commit SHA; `METADATA_REPO_RAW_URL` may override the raw host
but must still resolve that same revision.

## Metadata API

The v2 metadata resources separate navigation-sized summaries from resource
details. Every response includes the exact 40-character `metadataRevision`, an
ETag, and a stable `v2` envelope. Existing v1 resources remain compatible.

- `GET /api/v2/products` lists compact product identities and counts.
- `GET /api/v2/products/{slug}` returns the product overview plus Endpoint and
  Schema names/IDs, without request, response, or JSON Schema details.
- `GET /api/v2/products/{slug}/endpoints/{endpointSlug}?locale=en|zh` returns
  one complete Endpoint plus the transitive localized Schema closure it needs.
- `GET /api/v2/products/{slug}/schemas/{schemaName}?locale=en|zh` returns one
  complete Schema plus its transitive localized Schema closure.
- `GET /api/v2/products/{slug}/metadata?locale=en|zh` returns the complete
  product record and PontxSpec for agents, offline indexing, and bulk tools.
- `GET /api/v2/search` remains the shared catalog-wide API/Endpoint/Schema
  search resource.

The SSR documentation routes call the same server-side DTO builders directly;
they do not make an internal HTTP round trip or defer indexable content to the
browser. See `/openapi.json` for the discovery contract.

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

## Hub CLI and Agent Skills

The standalone [`pontx-hub-cli`](https://github.com/pontjs/pontx-hub-cli)
repository communicates only with the public Hub HTTP API. It provides one
hybrid semantic search across API products, Endpoints, request parameters,
request/response schemas, and PontxSpec data structures. It also discovers and
installs the universal `pontx-hub` Skill and focused product Skills without
coupling Hub releases to Pontx.

The universal Skill is packaged in the skills-only
[`Pontx API plugin`](./plugins/pontx-api), and is also discoverable from
the [Agent Skills Discovery v0.2 index](https://pontx.dev/.well-known/agent-skills/index.json).
The legacy [`/.well-known/skills/index.json`](https://pontx.dev/.well-known/skills/index.json)
remains available for existing clients. The
[RFC 9727 API Catalog](https://pontx.dev/.well-known/api-catalog) connects the
Hub services to their OpenAPI description, human documentation, and Skill
metadata, while [`/llms.txt`](https://pontx.dev/llms.txt) provides a compact
Agent-readable map of the canonical documentation and
[`/openapi.json`](https://pontx.dev/openapi.json) describes the read-only Hub
discovery API.

This repository also exposes a Codex marketplace manifest. From a local
checkout, add the marketplace and install the plugin with:

```bash
codex plugin marketplace add .
codex plugin add pontx-api@pontx
```

Use the universal Skill and `pontx-hub` CLI for catalog-wide discovery,
PontxSpec inspection, safe request preview, and approved calls. Product Skills
named `pontx-<apiSlug>` come from `pontx-api-metadata` and add only
provider-specific integration flows, best practices, and caveats. Application
code uses the published `@pontx/<apiSlug>` SDK; neither Skill layer duplicates
the current Endpoint, Schema, authentication, or package metadata.

```bash
pontx-hub skill install
pontx-hub skill list
pontx-hub skill install stripe-identity

pontx-hub search "exchange rate" --json
pontx-hub search "创建任务的入参" --locale zh --json
pontx-hub search "返回 dueDate 的接口" --locale zh --json
pontx-hub search projectId --type schema --json
pontx-hub show schema:dida365/TaskCreate
pontx-hub sdk stripe-identity
```

The reusable search contract is `GET /api/v2/search`. The endpoint accepts
`q`, `locale`, `types`, `limit`, and `offset`; every result includes a stable
resource ID, direct Hub URL, lexical/semantic/hybrid match mode, and the
matched metadata fields. Product metadata and the complete endpoint input /
output schema graph participate in ranking. The search is deterministic and
requires no runtime AI credential. The legacy endpoint-only
`GET /api/v1/search` remains available for older clients.
