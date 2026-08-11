export type FavoriteEndpointIdentity = {
  apiSlug: string;
  operationSlug: string;
};

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
