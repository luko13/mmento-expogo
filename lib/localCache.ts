// utils/localCache.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

/** =========================================================
 *  Detección de entorno
 *  - Expo Go o Debug Remoto => Fallback (sin MMKV nativo)
 *  - Dev/Prod on-device (Hermes activo) => MMKV nativo
 * ========================================================= */
const isExpoGo = Constants.appOwnership === "expo";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const HermesInternal: any | undefined;
const isRemoteDebugging = typeof HermesInternal === "undefined";
const shouldFallback = isExpoGo || isRemoteDebugging;

/** =========================================================
 *  MMKV lazy + Fallback en memoria hidratado con AsyncStorage
 * ========================================================= */
let nativeMMKV: any = null;
function getNativeMMKV() {
  if (!nativeMMKV) {
    // carga en runtime para evitar crashear en entornos no soportados
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MMKV } = require("react-native-mmkv");
    nativeMMKV = new MMKV({ id: "mmento-cache" });
  }
  return nativeMMKV;
}

// Fallback sincronizado
const mem = new Map<string, string>();
let hydrated = false;
(async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    if (keys && keys.length) {
      const pairs = await AsyncStorage.multiGet(keys);
      for (const [k, v] of pairs) {
        if (k != null && v != null) mem.set(k, v);
      }
    }
  } catch {}
  hydrated = true;
})();

// Helpers fallback <-> AsyncStorage
function setAsyncFallback(key: string, value: string | null) {
  if (value === null) {
    AsyncStorage.removeItem(key).catch(() => {});
    mem.delete(key);
  } else {
    AsyncStorage.setItem(key, value).catch(() => {});
    mem.set(key, value);
  }
}

/** =========================================================
 *  API compatible con MMKV (wrapper)
 * ========================================================= */
export const mmkv = {
  set(key: string, value: string | number | boolean) {
    if (!shouldFallback) {
      const s = getNativeMMKV();
      if (typeof value === "string") s.set(key, value);
      else if (typeof value === "number") s.set(key, value);
      else s.set(key, value ? 1 : 0);
      return;
    }
    setAsyncFallback(key, String(value));
  },

  getString(key: string): string | undefined {
    if (!shouldFallback) return getNativeMMKV().getString(key) ?? undefined;
    return mem.get(key) ?? undefined;
  },

  getNumber(key: string): number | undefined {
    if (!shouldFallback) {
      const n = getNativeMMKV().getNumber(key);
      return typeof n === "number" ? n : undefined;
    }
    const raw = mem.get(key);
    if (raw == null) return undefined;
    const n = Number(raw);
    return Number.isNaN(n) ? undefined : n;
  },

  getBoolean(key: string): boolean | undefined {
    if (!shouldFallback) {
      const b = getNativeMMKV().getBoolean(key);
      return typeof b === "boolean" ? b : undefined;
    }
    const raw = mem.get(key);
    if (raw == null) return undefined;
    if (raw === "true" || raw === "1") return true;
    if (raw === "false" || raw === "0") return false;
    return undefined;
  },

  delete(key: string) {
    if (!shouldFallback) {
      getNativeMMKV().delete(key);
      return;
    }
    setAsyncFallback(key, null);
  },

  clearAll() {
    if (!shouldFallback) {
      getNativeMMKV().clearAll();
      return;
    }
    mem.clear();
    AsyncStorage.clear().catch(() => {});
  },

  getAllKeys(): string[] {
    if (!shouldFallback) return getNativeMMKV().getAllKeys();
    return Array.from(mem.keys());
  },
};

// Helpers JSON cómodos
const safeStringify = (v: unknown) => {
  try {
    return JSON.stringify(v);
  } catch {
    return "";
  }
};
const safeParse = <T = any>(txt: string | undefined | null): T | null => {
  if (!txt) return null;
  try {
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
};

/** =========================================================
 *  Claves y Tipos tal y como tenías
 * ========================================================= */
export interface SnapshotKeyParts {
  userId: string;
  page: number; // normalmente 0 para primer render
  catsKey: string; // "all" o lista de IDs "id1,id2"
  queryKey: string; // "no-query" o el texto
  filterKey: string; // JSON.stringify(filters normalizado)
}

export interface SnapshotMeta {
  hasMore: boolean;
  nextPage: number;
  ts: number; // epoch ms
  ver: number; // versión del snapshot (migraciones futuras)
}

export interface CategorySection {
  category: { id: string; name: string; [k: string]: any };
  items: any[];
}
export interface SectionsSnapshot extends SnapshotMeta {
  sections: CategorySection[];
  allCategories: any[];
}

const SNAP_VER = 1;

const K = {
  lastUserId: "lastUserId",
  profile: (userId: string) => `profile:${userId}`, // {userName, avatarUrl, ts}
  snapshot: (p: SnapshotKeyParts) =>
    `snapshot:${p.userId}:${p.catsKey}:${p.queryKey}:${p.filterKey}:p=${p.page}`,
};

/** --- lastUserId --- */
export const cacheAuth = {
  setLastUserId(userId: string) {
    try {
      mmkv.set(K.lastUserId, userId);
    } catch {}
  },
  getLastUserId(): string | null {
    try {
      return mmkv.getString(K.lastUserId) || null;
    } catch {
      return null;
    }
  },
  clearLastUserId() {
    try {
      mmkv.delete(K.lastUserId);
    } catch {}
  },
};

/** --- Perfil --- */
export interface ProfileSnapshot {
  userName: string;
  avatarUrl: string | null;
  ts: number;
}
export const cacheProfile = {
  set(userId: string, data: { userName: string; avatarUrl: string | null }) {
    try {
      mmkv.set(K.profile(userId), JSON.stringify({ ...data, ts: Date.now() }));
    } catch {}
  },
  get(userId: string): ProfileSnapshot | null {
    try {
      return safeParse<ProfileSnapshot>(mmkv.getString(K.profile(userId)));
    } catch {
      return null;
    }
  },
  delete(userId: string) {
    try {
      mmkv.delete(K.profile(userId));
    } catch {}
  },
};

/** --- Snapshots de secciones (categorías + items) --- */
export const cacheSections = {
  makeKey(parts: SnapshotKeyParts) {
    return K.snapshot(parts);
  },
  getSync(parts: SnapshotKeyParts): SectionsSnapshot | null {
    try {
      const txt = mmkv.getString(K.snapshot(parts));
      const data = safeParse<SectionsSnapshot>(txt);
      if (!data) return null;
      if (data.ver !== SNAP_VER) return null;
      return data;
    } catch {
      return null;
    }
  },
  set(
    parts: SnapshotKeyParts,
    sections: CategorySection[],
    allCategories: any[],
    meta: { hasMore: boolean; nextPage: number }
  ) {
    try {
      const payload: SectionsSnapshot = {
        sections,
        allCategories,
        hasMore: meta.hasMore,
        nextPage: meta.nextPage,
        ts: Date.now(),
        ver: SNAP_VER,
      };
      mmkv.set(K.snapshot(parts), safeStringify(payload));
    } catch {}
  },
  delete(parts: SnapshotKeyParts) {
    try {
      mmkv.delete(K.snapshot(parts));
    } catch {}
  },
  clearAllForUser(userId: string) {
    try {
      const keys = mmkv.getAllKeys();
      keys.forEach((k) => {
        if (k.startsWith(`snapshot:${userId}:`) || k === K.profile(userId)) {
          mmkv.delete(k);
        }
      });
    } catch {}
  },
};

/** Debug helpers */
export const localCacheDebug = {
  isUsingFallback: () => shouldFallback,
  isHydrated: () => hydrated,
};
export default mmkv;
