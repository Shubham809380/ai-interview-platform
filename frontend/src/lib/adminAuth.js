export const ADMIN_TOKEN_KEY = "ai_interview_admin_token";

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

export function setAdminToken(token) {
  const value = String(token || "").trim();
  if (!value) {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    return;
  }
  localStorage.setItem(ADMIN_TOKEN_KEY, value);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}
