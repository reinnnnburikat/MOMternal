/**
 * MOMternal Offline Fetch Interceptor
 *
 * A drop-in replacement for the native fetch() that transparently handles
 * offline scenarios:
 *
 * - GET requests when offline → returns cached data from offline-cache
 * - POST/PUT/PATCH when offline → enqueues to offline-queue and returns mock success
 * - POST/PUT/PATCH when online but fails → also enqueues and returns mock success
 */

import { getCache, setCache } from '@/lib/offline-cache';
import { enqueue, getQueueLength } from '@/lib/offline-queue';
import { useAppStore } from '@/store/app-store';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Derive a cache key from a URL (strip query params for list endpoints). */
function urlToCacheKey(url: string): string {
  // Remove query string for caching (we cache full unfiltered lists)
  const idx = url.indexOf('?');
  return idx > 0 ? url.slice(0, idx) : url;
}

/** Derive an action type from the URL and method. */
function deriveActionType(
  method: string,
  url: string,
): 'create-patient' | 'update-patient' | 'delete-patient' | 'create-consultation' | 'update-consultation' | 'ai-suggest' {
  if (url.includes('/consultations') && method === 'POST') return 'create-consultation';
  if (url.includes('/consultations') && (method === 'PUT' || method === 'PATCH')) return 'update-consultation';
  if (url.includes('/patients') && method === 'POST') return 'create-patient';
  if (url.includes('/patients') && method === 'DELETE') return 'delete-patient';
  if (url.includes('/patients') && (method === 'PUT' || method === 'PATCH')) return 'update-patient';
  if (url.includes('/ai') || url.includes('/suggest')) return 'ai-suggest';
  // Fallback
  return 'update-patient';
}

/** Small helper to create a Response-like object from JSON data. */
function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 503 ? 'Service Unavailable' : 'Error',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => data,
    text: async () => JSON.stringify(data),
    clone: function (): Response {
      return jsonResponse(data, status);
    },
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    bytes: async () => new Uint8Array(0),
  } as Response;
}

/** Check if an error is a network-level error (offline, DNS failure, etc.). */
function isNetworkError(err: unknown): boolean {
  if (!(err instanceof TypeError)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes('failed') || msg.includes('network') || msg.includes('load') || msg.includes('abort') || msg.includes('cors');
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Check if the browser is currently offline.
 */
export function isOffline(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !navigator.onLine;
}

/**
 * Drop-in replacement for fetch() that handles offline scenarios.
 *
 * Behaviour:
 * - GET requests:
 *   - When online: delegates to native fetch and caches the response.
 *   - When offline: returns cached data (if available) or a 503 error.
 *
 * - POST / PUT / PATCH / DELETE requests:
 *   - When online: delegates to native fetch.
 *   - If the fetch fails with a network error: enqueues the request and returns
 *     `{ success: true, offline: true, queueId: "<id>" }`.
 *   - When offline: immediately enqueues and returns the same offline-success shape.
 */
export async function offlineFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  // ── GET requests ─────────────────────────────────────────────────────
  if (!isMutation) {
    if (isOffline()) {
      // Try returning cached data
      const cacheKey = urlToCacheKey(url);
      const cached = getCache<unknown>(cacheKey);
      if (cached) {
        return jsonResponse({ success: true, data: cached, fromCache: true });
      }
      // No cache available
      return jsonResponse(
        { success: false, error: 'You are offline and no cached data is available.' },
        503,
      );
    }

    // Online — try real fetch, cache successful responses
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        // Attempt to cache the response body
        try {
          const clone = res.clone();
          const data = await clone.json();
          if (data?.success) {
            const cacheKey = urlToCacheKey(url);
            setCache(cacheKey, data.data);
          }
        } catch {
          // Not JSON or parseable — skip caching
        }
      }
      return res;
    } catch (err) {
      // Network error while online — try cache as fallback
      const cacheKey = urlToCacheKey(url);
      const cached = getCache<unknown>(cacheKey);
      if (cached) {
        return jsonResponse({ success: true, data: cached, fromCache: true });
      }
      return jsonResponse(
        { success: false, error: 'Connection error. No cached data available.' },
        503,
      );
    }
  }

  // ── Mutation requests (POST / PUT / PATCH / DELETE) ──────────────────
  if (isOffline()) {
    // Offline — enqueue immediately and return mock success
    const actionType = deriveActionType(method, url);
    let bodyObj: Record<string, unknown> = {};
    if (options.body) {
      try {
        bodyObj = JSON.parse(options.body as string) as Record<string, unknown>;
      } catch {
        bodyObj = {};
      }
    }

    const queueId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    enqueue(actionType, url, method as 'POST' | 'PUT' | 'PATCH' | 'DELETE', bodyObj);

    // Update Zustand store pending count
    try {
      useAppStore.getState().setPendingSyncCount(getQueueLength());
    } catch {
      // Store may not be available in all contexts
    }

    return jsonResponse({
      success: true,
      offline: true,
      queueId,
    });
  }

  // Online — try real fetch
  try {
    const res = await fetch(url, options);
    // If the server returns a non-OK response, let it propagate normally
    // (we only intercept *network* failures, not server errors)
    return res;
  } catch (err) {
    // Network-level failure while supposedly online — enqueue for retry
    if (isNetworkError(err)) {
      const actionType = deriveActionType(method, url);
      let bodyObj: Record<string, unknown> = {};
      if (options.body) {
        try {
          bodyObj = JSON.parse(options.body as string) as Record<string, unknown>;
        } catch {
          bodyObj = {};
        }
      }

      const queueId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      enqueue(actionType, url, method as 'POST' | 'PUT' | 'PATCH' | 'DELETE', bodyObj);

      try {
        useAppStore.getState().setPendingSyncCount(getQueueLength());
      } catch {
        // Store may not be available in all contexts
      }

      return jsonResponse({
        success: true,
        offline: true,
        queueId,
      });
    }

    // Non-network error — rethrow
    throw err;
  }
}
