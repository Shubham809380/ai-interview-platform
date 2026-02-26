const RESUME_STORE_KEY = "code_with_warrior_resume_store_v1";
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
    const raw = storage.getItem(RESUME_STORE_KEY);
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
    storage.setItem(RESUME_STORE_KEY, JSON.stringify(store));
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
function clampScore(value) {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(numericValue)));
}
function normalizeResume(resume) {
  const id = String(resume?.id || "").trim();
  if (!id) {
    return null;
  }
  const uploadedAt = new Date(resume?.uploadedAt || Date.now());
  const suggestions = Array.isArray(resume?.suggestions) ? resume.suggestions.map((item) => String(item || "").trim()).filter(Boolean) : [];
  return {
    id,
    name: String(resume?.name || "Untitled Resume").trim(),
    type: String(resume?.type || "text/plain").trim(),
    size: Number(resume?.size) || 0,
    uploadedAt: Number.isNaN(uploadedAt.getTime()) ? new Date().toISOString() : uploadedAt.toISOString(),
    text: String(resume?.text || ""),
    score: clampScore(resume?.score),
    status: String(resume?.status || "Needs Work"),
    suggestions
  };
}
export function listStoredResumes(user) {
  const store = readStore();
  const userKey = getUserKey(user);
  const resumes = Array.isArray(store[userKey]) ? store[userKey] : [];
  return resumes.map((resume) => normalizeResume(resume)).filter(Boolean).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}
export function saveStoredResume(user, resume) {
  const normalized = normalizeResume(resume);
  if (!normalized) {
    return listStoredResumes(user);
  }
  const store = readStore();
  const userKey = getUserKey(user);
  const existing = Array.isArray(store[userKey]) ? store[userKey] : [];
  const updated = [normalized, ...existing.filter((item) => String(item?.id || "").trim() !== normalized.id)].slice(0, 40);
  store[userKey] = updated;
  writeStore(store);
  return listStoredResumes(user);
}
export function removeStoredResume(user, resumeId) {
  const id = String(resumeId || "").trim();
  if (!id) {
    return listStoredResumes(user);
  }
  const store = readStore();
  const userKey = getUserKey(user);
  const existing = Array.isArray(store[userKey]) ? store[userKey] : [];
  store[userKey] = existing.filter((item) => String(item?.id || "").trim() !== id);
  writeStore(store);
  return listStoredResumes(user);
}