import { syncOfflineStatus, type OfflineStatusUpdate } from "./caseApiService";

const OFFLINE_QUEUE_KEY = "strayaid_offline_field_updates";

export function getOfflineQueue(): OfflineStatusUpdate[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineStatusUpdate[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error("[OfflineQueue] Failed to save queue to localStorage:", err);
  }
}

export function enqueueOfflineStatusUpdate(update: OfflineStatusUpdate): void {
  const queue = getOfflineQueue();
  queue.push(update);
  saveOfflineQueue(queue);
  console.log(`[OfflineQueue] Enqueued field update for case ${update.caseId}: ${update.status}`);
}

export async function flushOfflineQueue(): Promise<{ synced: number; remaining: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  if (!navigator.onLine) {
    console.log("[OfflineQueue] Device is offline. Sync deferred.");
    return { synced: 0, remaining: queue.length };
  }

  try {
    console.log(`[OfflineQueue] Flushing ${queue.length} offline updates to server...`);
    const result = await syncOfflineStatus(queue);
    
    if (result.success) {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      console.log(`[OfflineQueue] Successfully synced ${result.syncedCount} field status updates!`);
      return { synced: result.syncedCount, remaining: 0 };
    } else {
      console.warn("[OfflineQueue] Sync completed with partial errors:", result.errors);
      return { synced: result.syncedCount || 0, remaining: queue.length - (result.syncedCount || 0) };
    }
  } catch (err) {
    console.error("[OfflineQueue] Flush error:", err);
    return { synced: 0, remaining: queue.length };
  }
}

// Auto-listen for reconnection
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("[OfflineQueue] Internet connection restored! Triggering auto-sync...");
    flushOfflineQueue().catch(() => {});
  });
}
