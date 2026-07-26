# Pontx Hub

Curated, agent-ready OpenAPI documentation and TypeScript/Node.js SDK portal.

The site uses the established Pontx extension mark across its navigation,
footer, and browser icon.

## Development

```bash
pnpm install
pnpm dev
```

The curated source of truth lives in `catalog/apis`. Public pages and API
responses are server-rendered from the same validated catalog model.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm sdk:verify
```

`sdk:verify` checks the exact operator-prepublished npm package/version for
approved manifests. Draft manifests with `approvedSha256: pending` are skipped.

## Catalog maintenance

```bash
pnpm catalog:check
pnpm catalog:accept <slug> <candidate-sha256>
```

Candidate checks never activate a source automatically. Accepting a candidate
updates only its reviewed SHA-256 in the Git manifest.

## CLI and Agent Skill

Point a local Pontx checkout at the development Hub:

```bash
pontx hub --url http://127.0.0.1:5173 search repository
pontx hub --url http://127.0.0.1:5173 preview github get-repository \
  -p owner=octocat -p repo=Hello-World
pontx hub --url http://127.0.0.1:5173 skill install
```
