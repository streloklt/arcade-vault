import type { User } from "@/lib/types";
import { DEFAULT_SKIN, isSkinId, type SkinId } from "@/components/games/skins";

const USER_KEY = "av_user";
const USER_CHANGE_EVENT = "av-user-change";
const SKIN_KEY = "av_skin";
const SKIN_CHANGE_EVENT = "av-skin-change";

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

// Skin activo. Alcance global: un mismo skin aplica a todos los juegos del vault.
export function getStoredSkin(): SkinId {
  try {
    const raw = localStorage.getItem(SKIN_KEY);
    return isSkinId(raw) ? raw : DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}

export function setStoredSkin(skin: SkinId): void {
  try {
    localStorage.setItem(SKIN_KEY, skin);
  } catch {}
  window.dispatchEvent(new Event(SKIN_CHANGE_EVENT));
}

export function subscribeToSkinChanges(callback: () => void): () => void {
  window.addEventListener(SKIN_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SKIN_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
