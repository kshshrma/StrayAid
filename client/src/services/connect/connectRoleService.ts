import { supabase } from "../../lib/supabase";

export type ConnectRole = "guardian" | "ngo";

const ROLE_STORAGE_KEY_PREFIX = "strayaid_connect_role_";

/**
 * Read the Connect role for a specific user from localStorage synchronously
 */
export function getLocalConnectRole(userId: string): ConnectRole | null {
  try {
    const value = localStorage.getItem(`${ROLE_STORAGE_KEY_PREFIX}${userId}`);
    if (value === "guardian" || value === "ngo") {
      return value;
    }
    return null;
  } catch (err) {
    console.warn("Failed to read connect role from localStorage:", err);
    return null;
  }
}

/**
 * Save the Connect role for a specific user to localStorage
 */
export function setLocalConnectRole(userId: string, role: ConnectRole): void {
  try {
    localStorage.setItem(`${ROLE_STORAGE_KEY_PREFIX}${userId}`, role);
  } catch (err) {
    console.warn("Failed to save connect role to localStorage:", err);
  }
}

/**
 * Remove the Connect role for a specific user from localStorage
 */
export function removeLocalConnectRole(userId: string): void {
  try {
    localStorage.removeItem(`${ROLE_STORAGE_KEY_PREFIX}${userId}`);
  } catch (err) {
    console.warn("Failed to remove connect role from localStorage:", err);
  }
}

/**
 * Retrieve the saved Connect role for an authenticated user.
 * Checks localStorage first for zero-flicker loading, and reconciles
 * with Supabase user metadata for cross-device/fresh-browser persistence.
 */
export async function getConnectRole(userId: string): Promise<ConnectRole | null> {
  const localRole = getLocalConnectRole(userId);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const metaRole = session?.user?.user_metadata?.strayaid_connect_role as ConnectRole | undefined;

    if (metaRole === "guardian" || metaRole === "ngo") {
      // Keep local storage in sync if needed
      if (localRole !== metaRole) {
        setLocalConnectRole(userId, metaRole);
      }
      return metaRole;
    }
  } catch (err) {
    console.warn("Failed to retrieve role from Supabase user metadata:", err);
  }

  // If local role exists but wasn't in metadata yet, sync in background
  if (localRole) {
    supabase.auth
      .updateUser({ data: { strayaid_connect_role: localRole } })
      .catch((err) => console.warn("Failed to sync role to Supabase metadata:", err));
    return localRole;
  }

  return null;
}

/**
 * Persist the selected Connect role for the user in both localStorage and Supabase user metadata.
 */
export async function saveConnectRole(userId: string, role: ConnectRole): Promise<void> {
  // 1. Instant local persistence
  setLocalConnectRole(userId, role);

  // 2. Persist to Supabase auth user metadata so it survives across browsers / re-logins
  try {
    const { error } = await supabase.auth.updateUser({
      data: { strayaid_connect_role: role },
    });
    if (error) {
      console.warn("Could not save connect role to Supabase user metadata:", error);
    }
  } catch (err) {
    console.warn("Error calling updateUser for connect role:", err);
  }
}

/**
 * Clear the saved Connect role for the user from both localStorage and Supabase user metadata.
 */
export async function clearConnectRole(userId: string): Promise<void> {
  // 1. Clear local storage
  removeLocalConnectRole(userId);

  // 2. Clear from Supabase user metadata
  try {
    const { error } = await supabase.auth.updateUser({
      data: { strayaid_connect_role: null },
    });
    if (error) {
      console.warn("Could not clear connect role in Supabase user metadata:", error);
    }
  } catch (err) {
    console.warn("Error clearing connect role from Supabase metadata:", err);
  }
}
