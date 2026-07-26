import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { PreparedRequest } from "./schemas";

type ConfirmationPayload = {
  digest: string;
  expiresAt: number;
};

function getSecret(): string {
  const configured = process.env.PLAYGROUND_CONFIRMATION_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PLAYGROUND_CONFIRMATION_SECRET must contain at least 32 characters"
    );
  }
  return "pontx-hub-development-confirmation-secret";
}

function canonicalRequest(request: PreparedRequest): string {
  const headers = Object.fromEntries(
    Object.entries(request.headers).sort(([left], [right]) =>
      left.localeCompare(right)
    )
  );
  return JSON.stringify({
    apiSlug: request.apiSlug,
    operationSlug: request.operationSlug,
    method: request.method,
    url: request.url,
    headers,
    body: request.body ?? null
  });
}

function requestDigest(request: PreparedRequest): string {
  return createHash("sha256").update(canonicalRequest(request)).digest("hex");
}

function encode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function signature(encodedPayload: string): string {
  return createHmac("sha256", getSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createConfirmationToken(
  request: PreparedRequest,
  lifetimeMs = 5 * 60 * 1000
): string {
  const payload: ConfirmationPayload = {
    digest: requestDigest(request),
    expiresAt: Date.now() + lifetimeMs
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${signature(encodedPayload)}`;
}

export function verifyConfirmationToken(
  token: string,
  request: PreparedRequest
): boolean {
  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) return false;

  const expectedSignature = signature(encodedPayload);
  const left = Buffer.from(providedSignature);
  const right = Buffer.from(expectedSignature);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as ConfirmationPayload;
    return (
      payload.expiresAt > Date.now() &&
      payload.digest === requestDigest(request)
    );
  } catch {
    return false;
  }
}
