---
name: pontx-hub
description: Search, inspect, preview, call, and integrate curated OpenAPI resources through the standalone Pontx Hub CLI. Use when an agent needs to discover an API product, endpoint, or data schema; understand request or response metadata; generate TypeScript/Node.js SDK code; or safely perform an API call with preview and explicit mutation confirmation.
---

# Pontx Hub

Use `pontx-hub` as the authoritative interface to the curated API catalog. Keep
API metadata out of long-lived context by searching and loading only the
product, endpoint, or schema needed for the current task.

## Workflow

1. Search before choosing an API:

   ```bash
   pontx-hub search "<capability>" --json
   ```

   Narrow the result type when useful:

   ```bash
   pontx-hub search "<field-or-model>" --type schema --json
   ```

2. Inspect the selected stable resource ID:

   ```bash
   pontx-hub show endpoint:<api>/<endpoint>
   pontx-hub show schema:<api>/<schema>
   ```

3. For an endpoint, build and review the exact request without sending it:

   ```bash
   pontx-hub preview <api> <endpoint> -p key=value --body '<json>'
   ```

4. For GET or HEAD, call only when the user requested execution:

   ```bash
   pontx-hub call <api> <endpoint> -p key=value
   ```

5. For POST, PUT, PATCH, or DELETE, show the dry-run result and obtain explicit
   user confirmation. Then pass `--yes` without changing parameters:

   ```bash
   pontx-hub call <api> <endpoint> -p key=value --body '<json>' --yes
   ```

6. Generate integration code after the request shape is verified:

   ```bash
   pontx-hub sdk <api>
   ```

## Safety

- Never infer approval for a write from a request to inspect, explain, or
  preview an API.
- Never print, echo, log, or place credentials directly in command arguments.
- Read credentials from the environment variables named by `show`.
- Never call an arbitrary URL or an operation outside the Hub catalog.
- Never bypass `--dry-run` for a mutation.
- Treat a changed parameter, body, server, or operation as a new request that
  requires another dry-run and confirmation.
- Read [references/auth-and-safety.md](references/auth-and-safety.md) when
  configuring credentials, diagnosing authentication, or executing a mutation.

## Output

Prefer `--json` when consuming CLI output programmatically. Preserve the CLI
exit code and machine-readable error code when reporting failures. Use the
operation's published `@pontx/api-*` package when generating application code.
