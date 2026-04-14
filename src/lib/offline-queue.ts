/**
 * MOMternal Offline Queue System
 *
 * Stores failed API write operations in localStorage when offline,
 * then replays them when the connection is restored.
 */

const QUEUE_KEY = 'momternal-offline-queue';

export type OfflineActionType =
  | 'create-patient'
  | 'update-patient'
  | 'delete-patient'
  | 'create-consultation'
  | 'update-consultation'
  | 'ai-suggest';

interface OfflineAction {
  id: string; // unique id for dedup
  type: OfflineActionType;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  body: string; // JSON-serialized body
  timestamp: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function loadQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineAction[];
  } catch {
    return [];
  }
}

function saveQueue(queue: OfflineAction[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full — silently fail (queue is best-effort)
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Enqueue a failed API call for later replay.
 * Call this when a write operation fails due to being offline.
 */
export function enqueue(
  type: OfflineActionType,
  url: string,
  method: 'POST' | 'PUT' | 'PATCH',
  body: Record<string, unknown>,
): void {
  const queue = loadQueue();
  const action: OfflineAction = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    url,
    method,
    body: JSON.stringify(body),
    timestamp: Date.now(),
  };
  queue.push(action);
  saveQueue(queue);
}

/**
 * Replay all queued actions. Called when coming back online.
 * Removes successful actions from the queue. Returns count of
 * remaining failed actions.
 */
export async function processQueue(): Promise<{ processed: number; failed: number }> {
  const queue = loadQueue();
  if (queue.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;
  const remaining: OfflineAction[] = [];

  for (let i = 0; i < queue.length; i++) {
    const action = queue[i];
    try {
      const res = await fetch(action.url, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: action.body,
      });
      if (res.ok) {
        processed++;
      } else {
        // Server error — keep in queue for retry
        remaining.push(action);
        failed++;
      }
    } catch {
      // Still offline or network error — keep in queue
      remaining.push(action);
      failed++;
    }

    // Small delay between items to avoid overwhelming the server
    if (i < queue.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  saveQueue(remaining);
  return { processed, failed };
}

/**
 * Get the number of pending actions in the queue.
 */
export function getQueueLength(): number {
  return loadQueue().length;
}

/**
 * Empty the offline queue completely.
 */
export function clearQueue(): void {
  saveQueue([]);
}

/**
 * Get all queued actions (for display purposes).
 */
export function getQueue(): OfflineAction[] {
  return loadQueue();
}
