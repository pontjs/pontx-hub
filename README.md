# Pontx Hub

Curated, agent-ready OpenAPI documentation and TypeScript/Node.js SDK portal.

- Production: [pontx-hub.vercel.app](https://pontx-hub.vercel.app)
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

## Optional accounts

The account foundation is disabled by default. Public catalog, documentation,
search, SDK, and Playground routes do not require an account or database.

To enable GitHub sign-in in a configured environment, set:

```dotenv
PONTX_ACCOUNTS_ENABLED=true
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=<at-least-32-random-characters>
BETTER_AUTH_URL=https://your-hub-origin.example
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
PONTX_AUTH_TRUSTED_ORIGINS=https://optional-preview-origin.example
```

Register `${BETTER_AUTH_URL}/api/auth/callback/github` as the GitHub OAuth App
callback, then run `pnpm db:migrate` before enabling the feature. Do not put API
provider credentials in these variables or in the account database. GitHub
OAuth access, refresh, and ID tokens are removed before the identity mapping is
persisted. See [`docs/accounts-and-favorites.md`](./docs/accounts-and-favorites.md)
for the product and security boundary.

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
