const CACHE_PREFIX = 'momternal-cache-';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function setCache(key: string, data: unknown): void {
  try {
    const entry: CacheEntry<unknown> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function clearCache(key?: string): void {
  if (key) {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } else {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  }
}

export function isCacheValid(key: string): boolean {
  return getCache(key) !== null;
}

export function getCacheTimestamp(key: string): number | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const entry: CacheEntry<unknown> = JSON.parse(raw);
    return entry.timestamp;
  } catch {
    return null;
  }
}
