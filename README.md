# Pontx Hub

Curated, agent-ready OpenAPI documentation and TypeScript/Node.js SDK portal.

- Production: [pontx-hub.vercel.app](https://pontx-hub.vercel.app)
- Source: [pontjs/pontx-hub](https://github.com/pontjs/pontx-hub)
- API metadata: [pontjs/pontx-api-metadata](https://github.com/pontjs/pontx-api-metadata)
- Contributions: [CONTRIBUTING.md](./CONTRIBUTING.md)

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

## Hub CLI and Agent Skill

The Hub CLI is being separated from the `pontx` project into a standalone
`pontx-hub-cli` repository and npm package. It communicates with the public Hub
HTTP API and installs the Agent Skill without coupling Hub releases to Pontx.

Until that migration is complete, the website and HTTP API are the supported
interfaces.
