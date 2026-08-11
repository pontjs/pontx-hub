export type FavoriteEndpointIdentity = {
  apiSlug: string;
  operationSlug: string;
};

const ENDPOINT_FAVORITE_KEY_PREFIX = "endpoint:v1:";

export function endpointFavoriteStorageKey(
  favorite: FavoriteEndpointIdentity
): string {
  return `${ENDPOINT_FAVORITE_KEY_PREFIX}${encodeURIComponent(favorite.apiSlug)}:${encodeURIComponent(favorite.operationSlug)}`;
}

export function parseEndpointFavoriteStorageKey(
  value: string
): FavoriteEndpointIdentity | undefined {
  if (!value.startsWith(ENDPOINT_FAVORITE_KEY_PREFIX)) return undefined;
  const [apiSlugValue, operationSlugValue, ...extra] = value
    .slice(ENDPOINT_FAVORITE_KEY_PREFIX.length)
    .split(":");
  if (!apiSlugValue || !operationSlugValue || extra.length) return undefined;
  try {
    const apiSlug = decodeURIComponent(apiSlugValue);
    const operationSlug = decodeURIComponent(operationSlugValue);
    if (!apiSlug || !operationSlug) return undefined;
    return { apiSlug, operationSlug };
  } catch {
    return undefined;
  }
}

export function isFavoriteEndpoint(
  favorites: FavoriteEndpointIdentity[],
  apiSlug: string,
  operationSlug: string
): boolean {
  return favorites.some(
    (favorite) =>
      favorite.apiSlug === apiSlug && favorite.operationSlug === operationSlug
  );
}
