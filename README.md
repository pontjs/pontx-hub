# Pontx Hub

Curated, agent-ready OpenAPI documentation and TypeScript/Node.js SDK portal.

The site uses the established Pontx extension mark across its navigation,
footer, and browser icon.

## Development

```bash
pnpm install
pnpm dev
```

The curated source of truth lives in the separate
[`pontjs/pontx-api-metadata`](https://github.com/pontjs/pontx-api-metadata)
repository. The Hub synchronizes its compiled catalog before development,
tests, and production builds.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
```

## CLI and Agent Skill

Point a local Pontx checkout at the development Hub:

```bash
pontx hub --url http://127.0.0.1:5173 search repository
pontx hub --url http://127.0.0.1:5173 preview github get-repository \
  -p owner=octocat -p repo=Hello-World
pontx hub --url http://127.0.0.1:5173 skill install
```
