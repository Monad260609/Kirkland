// Fix broken localStorage global in Node.js 25+
// Node.js 25 provides a localStorage global object, but without a valid --localstorage-file path,
// the methods (getItem, setItem, etc.) are undefined, causing TypeErrors during SSR.
if (typeof localStorage !== "undefined" && typeof localStorage.getItem !== "function") {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, String(value)),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
      key: (index: number) => [...storage.keys()][index] ?? null,
      get length() {
        return storage.size;
      },
    },
    writable: true,
    configurable: true,
  });
}

export async function register() {
  // instrumentation hook
}
