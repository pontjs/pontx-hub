# Accounts and Favorites Design

Status: milestones 1–3 implemented behind a disabled-by-default feature flag

Date: 2026-08-11

## Decision

Pontx Hub will add optional user accounts and synchronized favorites without
making login a prerequisite for catalog browsing, documentation, search, SDK
discovery, Playground preview, or session-scoped execution.

The first release will support:

- signing in and signing out;
- saving an individual Endpoint;
- saving a platform-curated API collection;
- creating private personal collections of APIs;
- viewing and managing saved content across devices; and
- keeping a sanitized history of recent Playground executions for one-click
  parameter replay.

Cloud credential storage is explicitly out of scope. API keys, OAuth client
secrets, access tokens, and refresh tokens must continue to stay in browser
`sessionStorage` or the caller environment and must never enter the account or
favorites database.

Playground history is not a request/response archive. It stores only the
catalog identity, approved server identity, response status/duration, and a
sanitized replay snapshot. Authentication objects, response headers/bodies,
undeclared inputs, credential-like names, Schema fields marked `writeOnly` or
formatted as passwords, oversized values, and values beyond the storage
budget are removed before insertion.

## Product principles

1. Public-first: anonymous users retain the complete current public experience.
2. Progressive value: an account adds synchronization; it does not unlock API
   documentation or execution rights.
3. Minimal identity: collect only the provider identity, verified email,
   display name, avatar, and session data required for account operation.
4. Private by default: personal collections are private in the first release.
5. Stable resource identity: saved Endpoints use the catalog pair
   `(api.slug, operation.slug)`; saved curated collections use a stable
   `collection_key`. Locale-specific titles, routes, and database UUIDs are not
   resource identities.
6. No credential persistence: account sessions and provider API credentials
   are separate security domains.

## Authentication baseline

Use Better Auth with its React Router v7 integration and Drizzle PostgreSQL
adapter, backed by the existing Neon database.

Initial sign-in methods:

- GitHub OAuth for the first deploy;
- email one-time code after a transactional email provider and abuse controls
  are configured; and
- no Pontx-managed password authentication in the MVP.

Better Auth owns its generated user, session, account, verification, and
database-backed rate-limit tables.
Hub business tables reference the Better Auth user ID. Auth handlers are
mounted under `/api/auth/*`, while localized sign-in and account pages remain
normal React Router pages.

Required session policy:

- `HttpOnly`, `Secure` in production, same-site cookies;
- explicit trusted origins for production and preview environments;
- server-side session checks on every account mutation;
- session revocation on sign-out and account deletion;
- no auth tokens in URLs, analytics, logs, or rendered HTML; and
- rate limiting for sign-in, callback, verification, and mutation endpoints.

## Resource model

Better Auth generated tables are omitted below.

### `user_api_favorites` Endpoint compatibility storage

| Field | Notes |
| --- | --- |
| `user_id` | Better Auth user ID |
| `api_slug` | Versioned, URL-encoded `endpoint:v1:<apiSlug>:<operationSlug>` identity |
| `created_at` | Ordering and audit timestamp |

Primary key: `(user_id, api_slug)`.

The write path validates that the `(api_slug, operation_slug)` pair exists in
the active compiled catalog. The read path tolerates a retired pair and returns
it as unavailable so users can remove it instead of silently losing saved data.
The versioned composite value lets the Endpoint-granular contract deploy without
running the unrelated pending Playground-history migration first. Superseded
plain product-level values do not match the prefix and are ignored by the
product and private account API.

### `curated_collections`

Platform-curated collection definitions belong in `pontx-api-metadata`, not in
Hub application copy. The compiled catalog should eventually expose:

- stable `collection_key`;
- localized title and summary;
- ordered API slugs; and
- publication status.

Hub may mirror these records for query performance, but metadata remains the
source of truth.

### `user_collection_favorites`

| Field | Notes |
| --- | --- |
| `user_id` | Better Auth user ID |
| `collection_key` | Stable curated collection identity |
| `created_at` | Ordering and audit timestamp |

Primary key: `(user_id, collection_key)`.

### `user_collections`

| Field | Notes |
| --- | --- |
| `id` | UUID primary key |
| `user_id` | Owner; always required |
| `name` | User-provided, length-limited plain text |
| `description` | Optional length-limited plain text |
| `created_at` / `updated_at` | Timestamps |

Personal collections are private in the MVP. Public sharing, collaboration,
forking, and arbitrary external URLs are separate future capabilities.

### `user_collection_items`

| Field | Notes |
| --- | --- |
| `collection_id` | Owning personal collection |
| `api_slug` | Stable catalog API slug |
| `position` | Deterministic user-controlled order |
| `note` | Optional length-limited plain text |
| `created_at` | Timestamp |

Unique key: `(collection_id, api_slug)`. All queries must scope collection
access through the authenticated owner, not merely by collection UUID.

### `user_playground_history`

| Field | Notes |
| --- | --- |
| `id` | UUID history identity |
| `user_id` | Better Auth user ID; ownership boundary |
| `api_slug` / `operation_slug` / `server_id` | Current catalog replay target |
| `path` / `query` / `headers` / `request_body` | Sanitized, declared replay values only |
| `has_request_body` | Distinguishes no body from a JSON `null` body |
| `omitted_fields` | Field paths removed for sensitivity or size, never their values |
| `response_status` / `duration_ms` | Small outcome summary; no response payload |
| `created_at` | Reverse-chronological ordering |

The service retains at most the latest 100 entries per user. A retired API,
Endpoint, or server remains visible for deletion but cannot be replayed.

## Private HTTP surface

Account endpoints are browser-oriented private resources and must not be added
to the public Hub v1/v2 or CLI contracts.

Proposed routes:

```text
GET    /api/account/v1/me
DELETE /api/account/v1/me

GET    /api/account/v1/favorites/endpoints
PUT    /api/account/v1/favorites/endpoints/:apiSlug/:operationSlug
DELETE /api/account/v1/favorites/endpoints/:apiSlug/:operationSlug

GET    /api/account/v1/favorites/collections
PUT    /api/account/v1/favorites/collections/:collectionKey
DELETE /api/account/v1/favorites/collections/:collectionKey

GET    /api/account/v1/collections
POST   /api/account/v1/collections
PATCH  /api/account/v1/collections/:collectionId
DELETE /api/account/v1/collections/:collectionId
POST   /api/account/v1/collections/:collectionId/items
PATCH  /api/account/v1/collections/:collectionId/items/:apiSlug
DELETE /api/account/v1/collections/:collectionId/items/:apiSlug

GET    /api/account/v1/playground/history
DELETE /api/account/v1/playground/history/:historyId
```

History creation is server-owned by a successful
`POST /api/v1/playground/execute` path. Browsers cannot post arbitrary history
snapshots to the private account API.

Mutation responses use stable machine-readable errors. Creation and deletion
must be idempotent where practical. Requests require a valid same-origin
session and CSRF protection; CORS is not enabled for this surface.

## User experience

### Navigation and account pages

- Add a localized sign-in entry to desktop and mobile navigation.
- After sign-in, replace it with an account menu and saved-content entry.
- Add `/:locale/sign-in/*`, `/:locale/account/saved`, and
  `/:locale/account/history` routes.
- Preserve the full safe return path, locale, query, and fragment through
  sign-in. Reject off-origin return URLs.
- Account, sign-in, callback, and saved-content pages are `noindex` and absent
  from the sitemap.

### Save controls

- Endpoint search results and Endpoint detail pages expose the same accessible
  save state. API product cards and API overview pages do not expose a save
  control because a product is not the saved resource.
- Because a search result row is a whole-row link, the Endpoint save button must
  be a sibling control rather than an interactive element nested inside that
  link.
- An anonymous save action opens sign-in and preserves the resource context.
  It does not silently mutate data after authentication; the returned page
  shows the save control prominently for explicit confirmation.
- UI updates may be optimistic only when rollback and an accessible error
  message are implemented.
- All control copy and empty, loading, success, and error states are localized.

### Playground history

- A signed-in live execution is recorded automatically after the provider
  returns, including non-2xx provider responses that are useful for retrying.
- “Try again / 重新调试” restores the sanitized server, path, query, declared
  header, and body values into Playground `sessionStorage`, then opens the
  matching Endpoint.
- Any existing credential for that Endpoint may be reused only when it is
  already present in the same browser session. Cross-device replay requires
  entering or authorizing credentials again.
- Users can delete individual entries. Account deletion cascades through all
  history rows.

## Security and privacy boundary

Account data may contain identity, favorites, private collections, and
sanitized Playground history only. The following values are
forbidden from all account tables, collection notes, logs, analytics, error
tracking, and generated examples:

- API keys and bearer tokens;
- OAuth client secrets, authorization codes, access tokens, and refresh tokens;
- Basic-auth passwords; and
- complete Playground request headers or bodies that may contain secrets.

The history sanitizer applies defense in depth before every insert: it accepts
only inputs declared by the current catalog Endpoint; removes catalog auth
scheme locations and credential-like field names recursively; respects
`writeOnly`/password Schema hints; limits individual values, nesting, nodes,
and the total 64 KiB snapshot; and never copies the Playground `auth` object or
provider response. Recording is best-effort and must never change the public
execution response.

Collection names, descriptions, and notes are rendered as text, never as HTML.
Apply conservative length limits and mutation rate limits. Account deletion
must cascade through all favorites and personal collections and revoke active
sessions. Publish a concise privacy notice before production rollout.

## Delivery sequence

### Milestone 1: authentication foundation

- [x] add Better Auth and generated Drizzle schema;
- [ ] configure real GitHub OAuth and production/preview callback URLs;
- [x] add localized sign-in, account navigation, sign-out, and session loading;
- [x] add fail-closed configuration, return-path validation, tests, and noindex metadata;
- [x] add distributed database-backed auth rate limiting before production enablement; and
- [ ] deploy behind the disabled-by-default environment feature flag.

### Milestone 2: individual Endpoint favorites

- [x] add a versioned Endpoint identity to the existing favorites table and private API;
- [x] add save controls to Endpoint search results and Endpoint detail pages;
- [x] add the localized saved-content page;
- [x] verify disabled, invalid configuration, anonymous, cross-origin,
  unknown-Endpoint, retired-Endpoint presentation, bilingual, desktop, and
  390px states; and
- [ ] verify authenticated persistence, expired sessions, and cross-device sync
  against the configured production database and GitHub OAuth application.

### Milestone 3: Playground history

- [x] add the sanitized account history table and migration;
- [x] record signed-in live executions without changing the public execution contract;
- [x] add bilingual history navigation, replay, deletion, empty, and retired-target states;
- [x] cap retention at 100 entries and preserve session-only credential handling; and
- [ ] verify authenticated persistence, replay, deletion, and cross-device behavior
  against the configured production database and GitHub OAuth application.

### Milestone 4: collections

- add curated collection metadata contract producer-first compatibility;
- add curated collection favorites;
- add private personal collections, ordering, notes, and deletion; and
- verify ownership isolation and concurrent updates.

### Milestone 5: production hardening

- configure distributed rate limiting;
- complete privacy/account deletion flows and abuse review;
- run migration rollback rehearsal and database backups;
- run desktop and 390px mobile checks in both locales; and
- enable the feature flag only after production E2E and security review.

## Acceptance criteria

- Every existing public page and public Hub API remains usable when signed out.
- A user can sign in, save and unsave an Endpoint, and observe the same state in a
  second session.
- A signed-in user can execute an Endpoint, open the synchronized history on a
  later visit, and restore its non-sensitive inputs without re-entering them.
- Stored history and its rendered/JSON representations contain no provider
  credential, response body, or response header.
- One user cannot read or mutate another user's favorites or collections by
  changing an identifier.
- Locale switching retains the current account or saved-content resource.
- Deep-link sign-in returns only to a validated same-origin path.
- Account routes are noindex and excluded from the sitemap.
- Account deletion removes personal data and revokes sessions.
- Database, logs, analytics, and error output contain no provider credentials.
- Auth, resource validation, ownership, CSRF, rate-limit, i18n, SSR, and mobile
  tests pass together with the existing Hub test, typecheck, and build gates.

## Deferred decisions

- Encrypted cloud credential storage and credential sharing.
- Public or collaborative personal collections.
- CLI account login and synchronized favorites.
- Teams, roles, billing, and organization accounts.
- Passkeys, until the primary OAuth/email recovery path is operational.
