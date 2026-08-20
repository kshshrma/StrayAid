export interface OfflineReport {
  id: string;
  image: File;
  latitude: number;
  longitude: number;
  created_at: string;
}

const DB_NAME = "StrayAidOffline";
const STORE_NAME = "reportsQueue";
const DB_VERSION = 1;

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Enqueue a new animal report locally when offline.
 */
export async function enqueueReport(
  image: File,
  latitude: number,
  longitude: number
): Promise<string> {
  const db = await initDB();
  const id = crypto.randomUUID();
  const report: OfflineReport = {
    id,
    image,
    latitude,
    longitude,
    created_at: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(report);

    request.onsuccess = () => {
      resolve(id);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Retrieve all currently queued offline reports.
 */
export async function getQueuedReports(): Promise<OfflineReport[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Dequeue (delete) a report from local storage after successful upload.
 */
export async function dequeueReport(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}
