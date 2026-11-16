import { clearSelectedDepartment } from "./department";

const TOKEN_KEY = "campusiq_token";
const ROLE_KEY = "campusiq_role";

/**
 * Returns the current user's role, preferring the value stored at login
 * and falling back to decoding the JWT payload (covers sessions that
 * were created before the role was persisted separately).
 */
export function getUserRole(): string | null {
  const stored = localStorage.getItem(ROLE_KEY);
  if (stored) return stored;

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  clearSelectedDepartment();
}
