# Contributing to Pontx Hub

Pontx Hub is an open-source API reference and request-preview portal. Catalog data is maintained separately in [pontjs/pontx-api-metadata](https://github.com/pontjs/pontx-api-metadata).

## Development

```bash
pnpm install
pnpm dev
```

The development command synchronizes the current metadata catalog before starting React Router.

## Before opening a pull request

```bash
pnpm typecheck
pnpm test
pnpm build
```

Keep changes focused, preserve server-rendered documentation and canonical URLs, and make interactive controls keyboard accessible. Credentials must stay in browser session storage and must never appear in logs, persisted data, generated pages, or analytics.

## Where changes belong

- Website routes, rendering, SEO, and the secure Playground belong in this repository.
- OpenAPI documents, translations, attribution, approved hashes, and catalog entries belong in `pontx-api-metadata`.
- The standalone Hub CLI belongs in its own `pontx-hub-cli` repository.

For security issues, do not open a public issue containing credentials or exploit details. Contact the maintainers privately through the Pontx organization.
