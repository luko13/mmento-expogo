// utils/localCache.ts
import { MMKV } from "react-native-mmkv";

export const mmkv = new MMKV({ id: "mmento-cache" });

/** --- Tipos --- */
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
        if (k.startsWith(`snapshot:${userId}:`) || k === K.profile(userId))
          mmkv.delete(k);
      });
    } catch {}
  },
};
