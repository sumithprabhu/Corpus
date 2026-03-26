/**
 * Node (esp. with `--localstorage-file`) can expose a broken `localStorage` where
 * `getItem` / `setItem` are not functions. WalletConnect / Wagmi read storage during
 * RSC/SSR passes — polyfill before any wallet/wagmi module runs.
 */
function installMemoryStorage(): Storage {
  const memory = new Map<string, string>()
  return {
    get length() {
      return memory.size
    },
    clear: () => {
      memory.clear()
    },
    getItem: (key: string) => (memory.has(key) ? memory.get(key)! : null),
    key: (index: number) => [...memory.keys()][index] ?? null,
    removeItem: (key: string) => {
      memory.delete(key)
    },
    setItem: (key: string, value: string) => {
      memory.set(key, value)
    },
  }
}

if (typeof window === "undefined") {
  const ls = globalThis.localStorage as Storage | undefined
  const broken =
    ls === undefined ||
    typeof ls.getItem !== "function" ||
    typeof ls.setItem !== "function"

  if (broken) {
    Object.defineProperty(globalThis, "localStorage", {
      value: installMemoryStorage(),
      configurable: true,
      writable: true,
    })
  }
}

export {}
