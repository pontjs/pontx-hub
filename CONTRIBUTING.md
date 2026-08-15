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

## Feedback and community

Pontx Hub uses public GitHub channels for website feedback:

- Report reproducible website problems with the [Website problem issue form](https://github.com/pontjs/pontx-hub/issues/new?template=website-bug.yml).
- Propose website improvements in [Feedback and Ideas discussions](https://github.com/pontjs/pontx-hub/discussions/categories/ideas).

Maintainers acknowledge, deduplicate, and triage new feedback within three business days. This is a response target, not an implementation deadline. Accepted discussions are converted or linked to an implementation issue; maintainers update the public thread when work starts, ships, or is not planned.

Issue and discussion labels use the same lifecycle: `status:needs-triage` → `status:planned` → `status:in-progress` → `status:done`. Feedback that will not be pursued is marked `status:not-planned` with a short explanation.

All feedback is public. Never include API keys, tokens, passwords, personal information, private provider responses, or security exploit details.

## Where changes belong

- Website routes, rendering, SEO, and the secure Playground belong in this repository.
- OpenAPI documents, translations, attribution, approved hashes, and catalog entries belong in `pontx-api-metadata`.
- The standalone Hub CLI belongs in [`pontjs/pontx-hub-cli`](https://github.com/pontjs/pontx-hub-cli).

For security issues, do not open a public issue containing credentials or exploit details. Contact the maintainers privately through the Pontx organization.
