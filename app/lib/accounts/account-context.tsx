import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { FavoriteEndpointIdentity } from "./favorites";

export type PublicAccountViewer = {
  id: string;
  name: string;
  image?: string | null;
};

type AccountContextValue = {
  enabled: boolean;
  loaded: boolean;
  viewer: PublicAccountViewer | null;
  favorites: FavoriteEndpointIdentity[];
  setFavorite: (identity: FavoriteEndpointIdentity, saved: boolean) => void;
};

const AccountContext = createContext<AccountContextValue>({
  enabled: false,
  loaded: false,
  viewer: null,
  favorites: [],
  setFavorite: () => undefined
});

type ViewerResponse = {
  data?: { enabled?: boolean; viewer?: PublicAccountViewer | null };
};

type FavoritesResponse = {
  data?: { endpoints?: FavoriteEndpointIdentity[] };
};

export function AccountProvider({
  children,
  initialState
}: {
  children?: React.ReactNode;
  initialState?: Pick<AccountContextValue, "enabled" | "loaded" | "viewer" | "favorites">;
}) {
  const [enabled, setEnabled] = useState(initialState?.enabled ?? false);
  const [loaded, setLoaded] = useState(initialState?.loaded ?? false);
  const [viewer, setViewer] = useState<PublicAccountViewer | null>(initialState?.viewer ?? null);
  const [favorites, setFavorites] = useState<FavoriteEndpointIdentity[]>(initialState?.favorites ?? []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/account/v1/viewer", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("viewer_failed");
        return response.json() as Promise<ViewerResponse>;
      })
      .then((payload) => {
        setEnabled(Boolean(payload.data?.enabled));
        setViewer(payload.data?.viewer ?? null);
        setLoaded(true);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoaded(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!viewer) {
      setFavorites([]);
      return;
    }
    const controller = new AbortController();
    void fetch("/api/account/v1/favorites/endpoints", {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("favorites_failed");
        return response.json() as Promise<FavoritesResponse>;
      })
      .then((payload) => setFavorites(payload.data?.endpoints ?? []))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });
    return () => controller.abort();
  }, [viewer?.id]);

  const value = useMemo<AccountContextValue>(() => ({
    enabled,
    loaded,
    viewer,
    favorites,
    setFavorite(identity, saved) {
      setFavorites((current) => saved
        ? current.some((item) => item.apiSlug === identity.apiSlug && item.operationSlug === identity.operationSlug)
          ? current
          : [...current, identity]
        : current.filter((item) => item.apiSlug !== identity.apiSlug || item.operationSlug !== identity.operationSlug));
    }
  }), [enabled, favorites, loaded, viewer]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  return useContext(AccountContext);
}
