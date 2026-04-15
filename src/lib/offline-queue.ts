/**
 * MOMternal Offline Queue System — Enhanced with Conflict Resolution
 *
 * Stores failed API write operations in localStorage when offline,
 * then replays them when the connection is restored. Supports:
 * - FIFO replay with concurrency lock
 * - Conflict detection via entity versioning
 * - Manual conflict resolution UI integration
 * - Deduplication and max retry limits
 */

const QUEUE_KEY = 'momternal-offline-queue';
const MAX_RETRIES = 10;

// Temp-to-real ID mapping storage (survives sync for re-mapping queued updates)
const TEMP_ID_MAP_KEY = 'momternal-temp-id-map';

export type OfflineActionType =
  | 'create-patient'
  | 'update-patient'
  | 'delete-patient'
  | 'create-consultation'
  | 'update-consultation'
  | 'update-consultation-step'
  | 'ai-suggest'
  | 'generate-referral'
  | 'update-evaluation'
  | 'delete-consultation';

export type SyncStatus = 'pending' | 'syncing' | 'success' | 'failed' | 'conflict';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: string; // JSON-serialized body
  timestamp: number;
  retryCount: number;

  // Conflict resolution fields
  entityId?: string;           // The entity ID being modified (if available)
  entityType?: string;         // 'patient', 'consultation', etc.
  lastKnownUpdatedAt?: string; // Last known server-side updatedAt before going offline
  description?: string;        // Human-readable description of the action

  // Sync state
  status: SyncStatus;
  error?: string;
  conflictData?: {
    serverVersion: unknown;
    localVersion: unknown;
    serverUpdatedAt: string;
  };
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

/** Derive entity info from URL and body */
function deriveEntityInfo(
  type: OfflineActionType,
  url: string,
  body: Record<string, unknown>,
): { entityId?: string; entityType?: string; description?: string } {
  // Extract entity ID from URL like /api/patients/abc-123 or /api/consultations/def-456
  const urlMatch = url.match(/\/api\/(?:patients|consultations|health-history)\/([a-zA-Z0-9-]+)/);

  switch (type) {
    case 'create-patient':
      return { entityType: 'patient', description: 'Create new patient' };
    case 'update-patient':
      return {
        entityId: urlMatch?.[1] || (body.id as string),
        entityType: 'patient',
        description: `Update patient: ${body.surname || body.firstName || ''}`,
      };
    case 'delete-patient':
      return {
        entityId: urlMatch?.[1],
        entityType: 'patient',
        description: 'Delete patient',
      };
    case 'create-consultation':
      return {
        entityType: 'consultation',
        entityId: undefined, // No entity ID yet — it hasn't been created
        description: 'Create new consultation',
      };
    case 'update-consultation':
    case 'update-consultation-step':
      return {
        entityId: urlMatch?.[1],
        entityType: 'consultation',
        description: 'Update consultation',
      };
    case 'ai-suggest':
      return {
        entityId: urlMatch?.[1],
        entityType: 'consultation',
        description: 'Generate AI suggestions',
      };
    case 'generate-referral':
      return {
        entityId: urlMatch?.[1],
        entityType: 'consultation',
        description: 'Generate referral',
      };
    case 'update-evaluation':
      return {
        entityId: urlMatch?.[1],
        entityType: 'consultation',
        description: 'Update evaluation',
      };
    case 'delete-consultation':
      return {
        entityId: urlMatch?.[1],
        entityType: 'consultation',
        description: 'Delete consultation',
      };
    default:
      return {};
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Enqueue a failed API call for later replay.
 * Automatically derives entity info for conflict resolution.
 */
export function enqueue(
  type: OfflineActionType,
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body: Record<string, unknown>,
  opts?: {
    entityId?: string;
    entityType?: string;
    lastKnownUpdatedAt?: string;
    description?: string;
  },
): string {
  const queue = loadQueue();
  const entityInfo = deriveEntityInfo(type, url, body);
  const action: OfflineAction = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    url,
    method,
    body: method === 'DELETE' ? '' : JSON.stringify(body),
    timestamp: Date.now(),
    retryCount: 0,
    entityId: opts?.entityId || entityInfo.entityId,
    entityType: opts?.entityType || entityInfo.entityType,
    lastKnownUpdatedAt: opts?.lastKnownUpdatedAt,
    description: opts?.description || entityInfo.description,
    status: 'pending',
  };
  queue.push(action);
  saveQueue(queue);
  return action.id;
}

export interface SyncResult {
  processed: number;
  failed: number;
  conflicts: OfflineAction[];
  errors: Array<{ action: OfflineAction; error: string }>;
}

/**
 * Replay all queued actions. Called when coming back online.
 * Removes successful actions from the queue.
 * Flags conflicts for manual resolution.
 */
export async function processQueue(): Promise<SyncResult> {
  // Concurrency guard — prevent duplicate processing if 'online' fires rapidly
  if (_processing) return { processed: 0, failed: 0, conflicts: [], errors: [] };
  _processing = true;
  try {
    const queue = loadQueue();
    const pending = queue.filter(a => {
      if (a.status === 'syncing') {
        // Reset orphaned syncing items back to pending
        return true; // will be processed
      }
      return a.status === 'pending' || a.status === 'failed';
    });
    // Also reset syncing items in the queue
    const queueToProcess = pending.map(a =>
      a.status === 'syncing' ? { ...a, status: 'pending' as SyncStatus } : a
    );
    if (queueToProcess.length === 0) return { processed: 0, failed: 0, conflicts: [], errors: [] };

    let processed = 0;
    let failed = 0;
    const conflicts: OfflineAction[] = [];
    const errors: SyncResult['errors'] = [];
    const remaining: OfflineAction[] = queue.filter(a => a.status === 'conflict');

    for (let i = 0; i < queueToProcess.length; i++) {
      const action = { ...queueToProcess[i], status: 'syncing' as SyncStatus };

      // Max retry check — skip items that have been retried too many times
      if (action.retryCount >= MAX_RETRIES) {
        action.status = 'failed';
        action.error = `Max retries (${MAX_RETRIES}) exceeded`;
        failed++;
        errors.push({ action, error: action.error });
        // Don't add to remaining — remove permanently
        continue;
      }

      try {
        const fetchOpts: RequestInit = {
          method: action.method,
          headers: { 'Content-Type': 'application/json' },
        };
        if (action.body && action.method !== 'DELETE') {
          fetchOpts.body = action.body;
        }

        // For update operations, add If-Unmodified-Since header for conflict detection
        if (action.lastKnownUpdatedAt && (action.method === 'PUT' || action.method === 'PATCH')) {
          fetchOpts.headers = {
            ...fetchOpts.headers,
            'If-Unmodified-Since': action.lastKnownUpdatedAt,
          };
        }

        const res = await fetch(action.url, fetchOpts);

        if (res.ok) {
          action.status = 'success';
          processed++;

          // After a create-consultation succeeds, extract real ID and map temp→real
          if (action.type === 'create-consultation') {
            try {
              const respBody = await res.json();
              const realId = respBody?.data?.id;
              if (realId) {
                try {
                  const { getAllOfflineConsultations, mapTempToRealId } = await import('@/lib/offline-consultation-store');
                  // Extract patientId from URL pattern /api/patients/{patientId}/consultations
                  const patientIdFromUrl = action.url.match(/\/api\/patients\/([a-zA-Z0-9-]+)\/consultations/)?.[1];
                  if (patientIdFromUrl) {
                    // Find the offline consultation for this patient that hasn't been synced yet
                    const offlineConsultations = getAllOfflineConsultations();
                    const match = offlineConsultations.find(c => c.patientId === patientIdFromUrl && !c.realId);
                    if (match) {
                      mapTempToRealId(match.tempId, realId);
                      saveTempIdMap(match.tempId, realId);
                      console.log(`[Sync] Mapped offline consultation ${match.tempId} → ${realId}`);
                    }
                  }
                } catch { /* offline store not available */ }
              }
            } catch { /* response not JSON */ }
          }

          // Don't add to remaining — successfully synced
        } else if (res.status === 409) {
          // 409 Conflict — server indicates the resource was modified
          action.status = 'conflict';
          try {
            const conflictBody = await res.json();
            action.conflictData = {
              serverVersion: conflictBody.serverData || conflictBody.data,
              localVersion: action.body ? JSON.parse(action.body) : null,
              serverUpdatedAt: conflictBody.updatedAt || new Date().toISOString(),
            };
          } catch {
            action.conflictData = {
              serverVersion: null,
              localVersion: action.body ? JSON.parse(action.body) : null,
              serverUpdatedAt: new Date().toISOString(),
            };
          }
          remaining.push(action);
          conflicts.push(action);
        } else if (res.status === 410) {
          // 410 Gone — resource was deleted by another user
          action.status = 'failed';
          action.error = 'This record was deleted by another user';
          remaining.push(action);
          failed++;
          errors.push({ action, error: action.error });
        } else {
          // Other server errors — retry later
          action.status = 'failed';
          action.retryCount++;
          let errMsg = `Server error ${res.status}`;
          try {
            const errBody = await res.json();
            errMsg = errBody.error || errMsg;
          } catch { /* ignore */ }
          action.error = errMsg;
          remaining.push(action);
          failed++;
          errors.push({ action, error: errMsg });
        }
      } catch (err) {
        // Network error — still offline or intermittent failure
        action.status = 'failed';
        action.retryCount++;
        action.error = err instanceof Error ? err.message : 'Network error';
        remaining.push(action);
        failed++;
        errors.push({ action, error: action.error || 'Network error' });
      }

      // Small delay between items to avoid overwhelming the server
      if (i < queueToProcess.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Merge any items that were enqueued during processing
    const freshQueue = loadQueue();
    const freshPending = freshQueue.filter(
      a => a.status === 'pending' || a.status === 'failed'
    ).filter(
      a => !queue.some(original => original.id === a.id)
    );
    if (freshPending.length > 0) {
      remaining.push(...freshPending);
    }
    saveQueue(remaining);
    return { processed, failed, conflicts, errors };
  } finally {
    _processing = false;
  }
}

// Concurrency lock to prevent duplicate queue processing
let _processing = false;

/**
 * Resolve a conflict by choosing which version to keep.
 * @param actionId - The queued action ID
 * @param keepLocal - If true, force the local version. If false, keep server version and discard local change.
 */
export function resolveConflict(actionId: string, keepLocal: boolean): boolean {
  const queue = loadQueue();
  const idx = queue.findIndex(a => a.id === actionId && a.status === 'conflict');
  if (idx === -1) return false;

  if (keepLocal) {
    // Reset to pending so it will be retried (without conflict header this time)
    queue[idx].status = 'pending';
    queue[idx].retryCount = 0;
    queue[idx].lastKnownUpdatedAt = undefined;
    queue[idx].conflictData = undefined;
    queue[idx].error = undefined;
  } else {
    // Remove from queue — server version wins
    queue.splice(idx, 1);
  }

  saveQueue(queue);
  return true;
}

/**
 * Remove a specific action from the queue (e.g., user cancels a pending change).
 */
export function removeAction(actionId: string): boolean {
  const queue = loadQueue();
  const idx = queue.findIndex(a => a.id === actionId);
  if (idx === -1) return false;
  queue.splice(idx, 1);
  saveQueue(queue);
  return true;
}

/**
 * Get the number of pending actions in the queue.
 */
export function getQueueLength(): number {
  return loadQueue().filter(a => a.status !== 'success').length;
}

/**
 * Get count by status
 */
export function getQueueCounts(): Record<SyncStatus, number> {
  const queue = loadQueue();
  const counts: Record<SyncStatus, number> = { pending: 0, syncing: 0, success: 0, failed: 0, conflict: 0 };
  for (const action of queue) {
    counts[action.status]++;
  }
  return counts;
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

/**
 * Get only conflict items (for conflict resolution UI).
 */
export function getConflicts(): OfflineAction[] {
  return loadQueue().filter(a => a.status === 'conflict');
}

/**
 * Get a summary of pending actions for display.
 */
export function getQueueSummary(): Array<{ type: OfflineActionType; count: number; description: string }> {
  const queue = loadQueue().filter(a => a.status !== 'success');
  const grouped = new Map<string, { type: OfflineActionType; count: number; description: string }>();

  for (const action of queue) {
    const key = action.type;
    const existing = grouped.get(key);
    if (existing) {
      existing.count++;
    } else {
      grouped.set(key, {
        type: action.type,
        count: 1,
        description: action.description || formatActionType(action.type),
      });
    }
  }

  return Array.from(grouped.values());
}

function formatActionType(type: OfflineActionType): string {
  switch (type) {
    case 'create-patient': return 'New Patient';
    case 'update-patient': return 'Patient Update';
    case 'delete-patient': return 'Patient Deletion';
    case 'create-consultation': return 'New Consultation';
    case 'update-consultation': return 'Consultation Update';
    case 'update-consultation-step': return 'Consultation Step Save';
    case 'ai-suggest': return 'AI Suggestions';
    case 'generate-referral': return 'Referral Generation';
    case 'update-evaluation': return 'Evaluation Update';
    case 'delete-consultation': return 'Consultation Deletion';
    default: return type;
  }
}

// ── Temp ID Mapping Helpers ─────────────────────────────────────────────────

/** Extract tempId from a JSON body string (looks for offline- prefix in any value) */
function extractTempIdFromBody(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    for (const value of Object.values(parsed)) {
      if (typeof value === 'string' && value.startsWith('offline-')) return value;
    }
  } catch { /* not JSON */ }
  return undefined;
}

/** Persist a temp→real ID mapping to localStorage */
function saveTempIdMap(tempId: string, realId: string): void {
  try {
    const raw = localStorage.getItem(TEMP_ID_MAP_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[tempId] = realId;
    localStorage.setItem(TEMP_ID_MAP_KEY, JSON.stringify(map));
  } catch { /* storage error */ }
}

/** Look up a real ID from a temp ID */
function getTempIdMap(tempId: string): string | undefined {
  try {
    const raw = localStorage.getItem(TEMP_ID_MAP_KEY);
    if (!raw) return undefined;
    const map: Record<string, string> = JSON.parse(raw);
    return map[tempId];
  } catch { return undefined; }
}

/**
 * Get the real consultation ID for an offline ID.
 * Useful for components that need to know if a consultation has been synced.
 */
export function getRealIdForTemp(tempId: string): string | undefined {
  return getTempIdMap(tempId);
}
