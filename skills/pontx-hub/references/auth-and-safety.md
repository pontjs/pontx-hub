# Authentication and mutation safety

## Credentials

The Hub catalog declares the environment variable expected by each API. Set the
secret in the user's shell or secret manager before calling the CLI. Do not
write the value into source files, generated examples, chat messages, or CLI
arguments.

Supported v1 schemes:

- API Key in an approved header or query parameter
- Bearer token
- Existing OAuth2 access token
- Basic Auth credentials

The Hub does not run OAuth authorization callbacks or store refresh tokens.

## Mutations

POST, PUT, PATCH, and DELETE are mutations even when their names sound
read-only. Always:

1. Inspect the operation metadata.
2. Run `pontx-hub preview <api> <endpoint>`.
3. Present the resolved method, host, path, query, redacted headers, and body.
4. State the expected side effect.
5. Ask the user to confirm that exact request.
6. Run the unchanged request with `pontx-hub call <api> <endpoint> --yes`.

If confirmation is missing, ambiguous, or applies to different parameters, stop
without sending the request.
