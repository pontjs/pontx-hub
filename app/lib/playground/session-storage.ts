const PLAYGROUND_KEY_PREFIX = "playground:";
const bridgeMarker = Symbol.for("pontx-hub.playground-session-storage");

type PatchedWindow = Window & {
  [bridgeMarker]?: boolean;
};

/**
 * @pontx/shadcn-ui persists Playground state in localStorage. Hub credentials
 * must be session-only, so route only the component's scoped keys to
 * sessionStorage before it renders.
 */
export function installPlaygroundSessionStorageBridge(): void {
  if (typeof window === "undefined") return;

  const patchedWindow = window as PatchedWindow;
  if (patchedWindow[bridgeMarker]) return;

  const storagePrototype = Object.getPrototypeOf(
    window.localStorage
  ) as Storage;
  const originalGetItem = storagePrototype.getItem;
  const originalSetItem = storagePrototype.setItem;
  const originalRemoveItem = storagePrototype.removeItem;

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(PLAYGROUND_KEY_PREFIX)) continue;
    const value = originalGetItem.call(window.localStorage, key);
    if (value !== null) {
      originalSetItem.call(window.sessionStorage, key, value);
    }
    originalRemoveItem.call(window.localStorage, key);
  }

  storagePrototype.getItem = function getItem(key: string) {
    if (this === window.localStorage && key.startsWith(PLAYGROUND_KEY_PREFIX)) {
      return originalGetItem.call(window.sessionStorage, key);
    }
    return originalGetItem.call(this, key);
  };

  storagePrototype.setItem = function setItem(key: string, value: string) {
    if (this === window.localStorage && key.startsWith(PLAYGROUND_KEY_PREFIX)) {
      originalSetItem.call(window.sessionStorage, key, value);
      return;
    }
    originalSetItem.call(this, key, value);
  };

  storagePrototype.removeItem = function removeItem(key: string) {
    if (this === window.localStorage && key.startsWith(PLAYGROUND_KEY_PREFIX)) {
      originalRemoveItem.call(window.sessionStorage, key);
      return;
    }
    originalRemoveItem.call(this, key);
  };

  patchedWindow[bridgeMarker] = true;
}
