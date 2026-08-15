const CREDENTIAL_GUIDE_PREFERENCE_PREFIX = "pontx:credential-guide:collapsed";
const COLLAPSED_VALUE = "1";

type PreferenceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function credentialGuidePreferenceKey(
  apiSlug: string,
  schemeId: string
): string {
  return [
    CREDENTIAL_GUIDE_PREFERENCE_PREFIX,
    encodeURIComponent(apiSlug),
    encodeURIComponent(schemeId)
  ].join(":");
}

export function isCredentialGuideCollapsed(
  storage: PreferenceStorage,
  apiSlug: string,
  schemeId: string
): boolean {
  try {
    return storage.getItem(
      credentialGuidePreferenceKey(apiSlug, schemeId)
    ) === COLLAPSED_VALUE;
  } catch {
    return false;
  }
}

export function persistCredentialGuideCollapsed(
  storage: PreferenceStorage,
  apiSlug: string,
  schemeId: string,
  collapsed: boolean
): void {
  const key = credentialGuidePreferenceKey(apiSlug, schemeId);

  try {
    if (collapsed) {
      storage.setItem(key, COLLAPSED_VALUE);
      return;
    }

    storage.removeItem(key);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function isBrowserCredentialGuideCollapsed(
  apiSlug: string,
  schemeId: string
): boolean {
  if (typeof window === "undefined") return false;

  try {
    return isCredentialGuideCollapsed(window.localStorage, apiSlug, schemeId);
  } catch {
    return false;
  }
}

export function persistBrowserCredentialGuideCollapsed(
  apiSlug: string,
  schemeId: string,
  collapsed: boolean
): void {
  if (typeof window === "undefined") return;

  try {
    persistCredentialGuideCollapsed(
      window.localStorage,
      apiSlug,
      schemeId,
      collapsed
    );
  } catch {
    // Reading the storage object itself can fail in restricted contexts.
  }
}
