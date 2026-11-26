const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Pings the backend to warm up Render from cold sleep
 * Returns true if the backend is reachable, false otherwise.
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${API_URL}/`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (err) {
    console.warn("[BackendHealth] Backend is currently waking up or unreachable:", err);
    return false;
  }
}
