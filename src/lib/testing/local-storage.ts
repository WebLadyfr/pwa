/** Faux localStorage en mémoire pour les tests (environnement Node). */
export function installFakeLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  const fake = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  // Object.keys(localStorage) doit lister les clés, comme dans un navigateur : on expose un Proxy.
  const proxy = new Proxy(fake, {
    ownKeys: () => [...store.keys()],
    getOwnPropertyDescriptor: (_t, p) => (typeof p === "string" && store.has(p) ? { enumerable: true, configurable: true, value: store.get(p) } : undefined),
  });
  (globalThis as unknown as { localStorage: unknown }).localStorage = proxy;
  return store;
}
