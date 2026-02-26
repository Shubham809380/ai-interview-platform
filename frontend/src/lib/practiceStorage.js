const PRACTICE_LOG_KEY = "ai_interview_practice_log_v1";
function getStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}
function readStore() {
  const storage = getStorage();
  if (!storage) {
    return {};
  }
  try {
    const raw = storage.getItem(PRACTICE_LOG_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function writeStore(store) {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(PRACTICE_LOG_KEY, JSON.stringify(store));
  } catch {
  }
}
function getUserKey(user) {
  if (user?.id) {
    return `uid:${user.id}`;
  }
  if (user?.email) {
    return `mail:${String(user.email).toLowerCase()}`;
  }
  return "guest";
}
export function saveCompletedPracticeSession({ user, sessionId, completedAt }) {
  const id = String(sessionId || "").trim();
  if (!id) {
    return;
  }
  const completed = new Date(completedAt || Date.now());
  if (Number.isNaN(completed.getTime())) {
    return;
  }
  const store = readStore();
  const userKey = getUserKey(user);
  const userStore = store[userKey] && typeof store[userKey] === "object" ? store[userKey] : {};
  const sessions = userStore.sessions && typeof userStore.sessions === "object" ? userStore.sessions : {};
  sessions[id] = completed.toISOString();
  store[userKey] = { sessions };
  writeStore(store);
}
export function getCompletedPracticeSessions(user) {
  const store = readStore();
  const userKey = getUserKey(user);
  const userStore = store[userKey];
  const sessions = userStore?.sessions;
  if (!sessions || typeof sessions !== "object") {
    return [];
  }
  return Object.entries(sessions).map(([sessionId, completedAt]) => ({
    sessionId: String(sessionId || "").trim(),
    completedAt: String(completedAt || "").trim()
  })).filter((entry) => entry.sessionId && entry.completedAt);
}
