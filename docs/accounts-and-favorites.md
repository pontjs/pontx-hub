# Accounts and Favorites Design

Status: milestone 1 implemented behind a disabled-by-default feature flag

Date: 2026-08-10

## Decision

Pontx Hub will add optional user accounts and synchronized favorites without
making login a prerequisite for catalog browsing, documentation, search, SDK
discovery, Playground preview, or session-scoped execution.

The first release will support:

- signing in and signing out;
- saving an individual API;
- saving a platform-curated API collection;
- creating private personal collections of APIs; and
- viewing and managing saved content across devices.

Cloud credential storage is explicitly out of scope. API keys, OAuth client
secrets, access tokens, and refresh tokens must continue to stay in browser
`sessionStorage` or the caller environment and must never enter the account or
favorites database.

## Product principles

1. Public-first: anonymous users retain the complete current public experience.
2. Progressive value: an account adds synchronization; it does not unlock API
   documentation or execution rights.
3. Minimal identity: collect only the provider identity, verified email,
   display name, avatar, and session data required for account operation.
4. Private by default: personal collections are private in the first release.
5. Stable resource identity: saved APIs use the catalog `api.slug`; saved
   curated collections use a stable `collection_key`. Locale-specific titles,
   routes, and database UUIDs are not resource identities.
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

Better Auth owns its generated user, session, account, and verification tables.
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

### `user_api_favorites`

| Field | Notes |
| --- | --- |
| `user_id` | Better Auth user ID |
| `api_slug` | Stable catalog API slug |
| `created_at` | Ordering and audit timestamp |

Primary key: `(user_id, api_slug)`.

The write path validates that `api_slug` exists in the active compiled catalog.
The read path tolerates a retired slug and returns it as unavailable so users
can remove it instead of silently losing saved data.

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

## Private HTTP surface

Account endpoints are browser-oriented private resources and must not be added
to the public Hub v1/v2 or CLI contracts.

Proposed routes:

```text
GET    /api/account/v1/me
DELETE /api/account/v1/me

GET    /api/account/v1/favorites/apis
PUT    /api/account/v1/favorites/apis/:apiSlug
DELETE /api/account/v1/favorites/apis/:apiSlug

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
```

Mutation responses use stable machine-readable errors. Creation and deletion
must be idempotent where practical. Requests require a valid same-origin
session and CSRF protection; CORS is not enabled for this surface.

## User experience

### Navigation and account pages

- Add a localized sign-in entry to desktop and mobile navigation.
- After sign-in, replace it with an account menu and saved-content entry.
- Add `/:locale/sign-in/*` and `/:locale/account/saved` routes.
- Preserve the full safe return path, locale, query, and fragment through
  sign-in. Reject off-origin return URLs.
- Account, sign-in, callback, and saved-content pages are `noindex` and absent
  from the sitemap.

### Save controls

- API catalog cards, search results, and API overview pages expose the same
  accessible save state.
- Because the existing API card is a whole-card link, the save button must be a
  sibling control rather than an interactive element nested inside that link.
- An anonymous save action opens sign-in and preserves the resource context.
  It does not silently mutate data after authentication; the returned page
  shows the save control prominently for explicit confirmation.
- UI updates may be optimistic only when rollback and an accessible error
  message are implemented.
- All control copy and empty, loading, success, and error states are localized.

## Security and privacy boundary

Account data may contain identity and favorites only. The following values are
forbidden from all account tables, collection notes, logs, analytics, error
tracking, and generated examples:

- API keys and bearer tokens;
- OAuth client secrets, authorization codes, access tokens, and refresh tokens;
- Basic-auth passwords; and
- complete Playground request headers or bodies that may contain secrets.

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
- [ ] add distributed auth rate limiting before production enablement; and
- [ ] deploy behind the disabled-by-default environment feature flag.

### Milestone 2: individual API favorites

- add `user_api_favorites` migration and private API;
- add save controls to cards, search results, and API overview pages;
- add the localized saved-content page; and
- verify anonymous, authenticated, expired-session, and retired-API states.

### Milestone 3: collections

- add curated collection metadata contract producer-first compatibility;
- add curated collection favorites;
- add private personal collections, ordering, notes, and deletion; and
- verify ownership isolation and concurrent updates.

### Milestone 4: production hardening

- configure distributed rate limiting;
- complete privacy/account deletion flows and abuse review;
- run migration rollback rehearsal and database backups;
- run desktop and 390px mobile checks in both locales; and
- enable the feature flag only after production E2E and security review.

## Acceptance criteria

- Every existing public page and public Hub API remains usable when signed out.
- A user can sign in, save and unsave an API, and observe the same state in a
  second session.
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
