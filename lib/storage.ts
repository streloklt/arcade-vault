import type { SavedScore, User } from "@/lib/types";

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";
const USER_CHANGE_EVENT = "av-user-change";

export function getStoredUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

let userSnapshotRaw: string | null = null;
let userSnapshot: User | null = null;

export function getStoredUserSnapshot(): User | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(USER_KEY);
  } catch {
    raw = null;
  }
  if (raw === userSnapshotRaw) return userSnapshot;
  userSnapshotRaw = raw;
  try {
    userSnapshot = JSON.parse(raw || "null");
  } catch {
    userSnapshot = null;
  }
  return userSnapshot;
}

export function setStoredUser(user: User): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
  window.dispatchEvent(new Event(USER_CHANGE_EVENT));
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {}
  window.dispatchEvent(new Event(USER_CHANGE_EVENT));
}

export function subscribeToUserChanges(callback: () => void): () => void {
  window.addEventListener(USER_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(USER_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function saveScore(entry: Omit<SavedScore, "at">): void {
  try {
    const all: SavedScore[] = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {}
}

export function getStoredScores(): SavedScore[] {
  try {
    return JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
  } catch {
    return [];
  }
}
