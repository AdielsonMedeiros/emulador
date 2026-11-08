const memoryStore = new Map();

export class SafeStorage {
  static getItem(key, fallback = null) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const val = window.localStorage.getItem(key);
        return val !== null ? val : fallback;
      }
    } catch (e) {}
    return memoryStore.has(key) ? memoryStore.get(key) : fallback;
  }

  static setItem(key, value) {
    const str = String(value);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, str);
      }
    } catch (e) {}
    memoryStore.set(key, str);
  }

  static removeItem(key) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}
    memoryStore.delete(key);
  }
}

export function getAppBaseUrl() {
  if (typeof window === "undefined" || !window.location) return "./";
  const loc = window.location;
  let basePath = loc.pathname;
  if (!basePath.endsWith("/")) {
    if (basePath.includes(".")) {
      basePath = basePath.substring(0, basePath.lastIndexOf("/") + 1);
    } else {
      basePath += "/";
    }
  }
  return loc.origin + basePath;
}

export function resolveAssetUrl(relPath) {
  if (!relPath) return "";
  if (/^(https?:|data:|blob:)/i.test(relPath)) return relPath;
  const clean = relPath.replace(/^\/+/, "");
  try {
    return new URL(clean, getAppBaseUrl()).href;
  } catch (e) {
    return clean;
  }
}
