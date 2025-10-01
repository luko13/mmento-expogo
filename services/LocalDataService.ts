// services/LocalDataService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================================
// CACHE EN MEMORIA + ASYNCSTORAGE
// ============================================================================

// Cache sincrónico en memoria (hydratado desde AsyncStorage al inicio)
const memoryCache = new Map<string, string>();
let isHydrated = false;

// Hidratar cache al inicio
(async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length > 0) {
      const items = await AsyncStorage.multiGet(keys);
      items.forEach(([key, value]) => {
        if (key && value) memoryCache.set(key, value);
      });
      console.log(`[LocalData] Cache hydrated: ${memoryCache.size} items`);
    }
    isHydrated = true;
  } catch (error) {
    console.error("[LocalData] Hydration error:", error);
    isHydrated = true; // continuar aunque falle
  }
})();

// Storage wrapper que usa memoria + AsyncStorage en background
const storage = {
  getString: (key: string): string | undefined => {
    return memoryCache.get(key);
  },
  set: (key: string, value: string): void => {
    memoryCache.set(key, value);
    // Persistir en background (no bloqueante)
    AsyncStorage.setItem(key, value).catch((e) =>
      console.error("[LocalData] AsyncStorage write error:", e)
    );
  },
  delete: (key: string): void => {
    memoryCache.delete(key);
    AsyncStorage.removeItem(key).catch((e) =>
      console.error("[LocalData] AsyncStorage delete error:", e)
    );
  },
  clearAll: (): void => {
    memoryCache.clear();
    AsyncStorage.clear().catch((e) =>
      console.error("[LocalData] AsyncStorage clear error:", e)
    );
  },
  getAllKeys: (): string[] => {
    return Array.from(memoryCache.keys());
  },
  contains: (key: string): boolean => {
    return memoryCache.has(key);
  },
};

console.log("[LocalData] Using AsyncStorage with in-memory cache");

// ============================================================================
// TIPOS
// ============================================================================

export interface LocalTrick {
  id: string;
  title: string;
  effect: string;
  secret: string;
  duration: number | null;
  reset: number | null;
  difficulty: number | null;
  angles: string[];
  notes: string;
  photo_url: string | null;
  effect_video_url: string | null;
  secret_video_url: string | null;
  is_public: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  category_ids: string[];
  tag_ids: string[];
  is_favorite: boolean;
}

export interface LocalCategory {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface LocalUserData {
  userId: string;
  categories: LocalCategory[];
  tricks: LocalTrick[];
  lastSync: number;
  version: number;
}

// ============================================================================
// CLASE PRINCIPAL
// ============================================================================

export class LocalDataService {
  private static instance: LocalDataService;
  private readonly CURRENT_VERSION = 2;

  static getInstance(): LocalDataService {
    if (!LocalDataService.instance) {
      LocalDataService.instance = new LocalDataService();
    }
    return LocalDataService.instance;
  }

  private userDataKey(userId: string): string {
    return `user_data:${userId}:v${this.CURRENT_VERSION}`;
  }

  private lastUserKey(): string {
    return "last_user_id";
  }

  // Esperar a que hydration termine (solo la primera vez)
  private async waitForHydration(): Promise<void> {
    if (isHydrated) return;

    let attempts = 0;
    while (!isHydrated && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
  }

  async getUserData(userId: string): Promise<LocalUserData | null> {
    await this.waitForHydration();

    try {
      const key = this.userDataKey(userId);
      const raw = storage.getString(key);

      if (!raw) {
        console.log("[LocalData] No cache found for user:", userId);
        return null;
      }

      const data = JSON.parse(raw) as LocalUserData;

      if (
        !data.userId ||
        !Array.isArray(data.categories) ||
        !Array.isArray(data.tricks)
      ) {
        console.warn("[LocalData] Invalid cache structure");
        return null;
      }

      console.log(
        `[LocalData] Cache hit: ${data.tricks.length} tricks, ${data.categories.length} categories`
      );

      return data;
    } catch (error) {
      console.error("[LocalData] Error reading cache:", error);
      return null;
    }
  }

  getLastUserId(): string | null {
    try {
      return storage.getString(this.lastUserKey()) || null;
    } catch {
      return null;
    }
  }

  hasCache(userId: string): boolean {
    return storage.contains(this.userDataKey(userId));
  }

  saveUserData(data: LocalUserData): boolean {
    try {
      const key = this.userDataKey(data.userId);

      const validatedData: LocalUserData = {
        userId: data.userId,
        categories: data.categories || [],
        tricks: data.tricks || [],
        lastSync: data.lastSync || Date.now(),
        version: this.CURRENT_VERSION,
      };

      storage.set(key, JSON.stringify(validatedData));
      storage.set(this.lastUserKey(), data.userId);

      console.log(
        `[LocalData] Saved: ${validatedData.tricks.length} tricks, ${validatedData.categories.length} categories`
      );

      return true;
    } catch (error) {
      console.error("[LocalData] Error saving cache:", error);
      return false;
    }
  }

  updateTricks(userId: string, tricks: LocalTrick[]): boolean {
    const existing = memoryCache.get(this.userDataKey(userId));
    if (!existing) return false;

    const data = JSON.parse(existing) as LocalUserData;
    return this.saveUserData({
      ...data,
      tricks,
      lastSync: Date.now(),
    });
  }

  updateCategories(userId: string, categories: LocalCategory[]): boolean {
    const existing = memoryCache.get(this.userDataKey(userId));
    if (!existing) return false;

    const data = JSON.parse(existing) as LocalUserData;
    return this.saveUserData({
      ...data,
      categories,
      lastSync: Date.now(),
    });
  }

  updateLastSync(userId: string): boolean {
    const existing = memoryCache.get(this.userDataKey(userId));
    if (!existing) return false;

    const data = JSON.parse(existing) as LocalUserData;
    return this.saveUserData({
      ...data,
      lastSync: Date.now(),
    });
  }

  toggleFavorite(userId: string, trickId: string): boolean {
    const existing = memoryCache.get(this.userDataKey(userId));
    if (!existing) return false;

    const data = JSON.parse(existing) as LocalUserData;
    const updatedTricks = data.tricks.map((trick) =>
      trick.id === trickId
        ? { ...trick, is_favorite: !trick.is_favorite }
        : trick
    );

    return this.saveUserData({
      ...data,
      tricks: updatedTricks,
      lastSync: Date.now(),
    });
  }

  addTrick(userId: string, trick: LocalTrick): boolean {
    const existing = memoryCache.get(this.userDataKey(userId));

    if (!existing) {
      return this.saveUserData({
        userId,
        categories: [],
        tricks: [trick],
        lastSync: Date.now(),
        version: this.CURRENT_VERSION,
      });
    }

    const data = JSON.parse(existing) as LocalUserData;
    const exists = data.tricks.some((t) => t.id === trick.id);
    if (exists) {
      console.warn("[LocalData] Trick already exists:", trick.id);
      return false;
    }

    return this.saveUserData({
      ...data,
      tricks: [...data.tricks, trick],
      lastSync: Date.now(),
    });
  }

  updateTrick(
    userId: string,
    trickId: string,
    updates: Partial<LocalTrick>
  ): boolean {
    const existing = memoryCache.get(this.userDataKey(userId));
    if (!existing) return false;

    const data = JSON.parse(existing) as LocalUserData;
    const updatedTricks = data.tricks.map((trick) =>
      trick.id === trickId
        ? { ...trick, ...updates, updated_at: new Date().toISOString() }
        : trick
    );

    return this.saveUserData({
      ...data,
      tricks: updatedTricks,
      lastSync: Date.now(),
    });
  }

  deleteTrick(userId: string, trickId: string): boolean {
    const existing = memoryCache.get(this.userDataKey(userId));
    if (!existing) return false;

    const data = JSON.parse(existing) as LocalUserData;
    const updatedTricks = data.tricks.filter((trick) => trick.id !== trickId);

    return this.saveUserData({
      ...data,
      tricks: updatedTricks,
      lastSync: Date.now(),
    });
  }

  addCategory(userId: string, category: LocalCategory): boolean {
    const existing = memoryCache.get(this.userDataKey(userId));

    if (!existing) {
      return this.saveUserData({
        userId,
        categories: [category],
        tricks: [],
        lastSync: Date.now(),
        version: this.CURRENT_VERSION,
      });
    }

    const data = JSON.parse(existing) as LocalUserData;
    const exists = data.categories.some((c) => c.id === category.id);
    if (exists) {
      console.warn("[LocalData] Category already exists:", category.id);
      return false;
    }

    return this.saveUserData({
      ...data,
      categories: [...data.categories, category],
      lastSync: Date.now(),
    });
  }

  updateCategory(
    userId: string,
    categoryId: string,
    updates: Partial<LocalCategory>
  ): boolean {
    const existing = memoryCache.get(this.userDataKey(userId));
    if (!existing) return false;

    const data = JSON.parse(existing) as LocalUserData;
    const updatedCategories = data.categories.map((cat) =>
      cat.id === categoryId
        ? { ...cat, ...updates, updated_at: new Date().toISOString() }
        : cat
    );

    return this.saveUserData({
      ...data,
      categories: updatedCategories,
      lastSync: Date.now(),
    });
  }

  deleteCategory(userId: string, categoryId: string): boolean {
    const existing = memoryCache.get(this.userDataKey(userId));
    if (!existing) return false;

    const data = JSON.parse(existing) as LocalUserData;
    const updatedCategories = data.categories.filter(
      (cat) => cat.id !== categoryId
    );
    const updatedTricks = data.tricks.map((trick) => ({
      ...trick,
      category_ids: trick.category_ids.filter((id) => id !== categoryId),
    }));

    return this.saveUserData({
      ...data,
      categories: updatedCategories,
      tricks: updatedTricks,
      lastSync: Date.now(),
    });
  }

  clearUserData(userId: string): boolean {
    try {
      const key = this.userDataKey(userId);
      storage.delete(key);
      console.log("[LocalData] Cleared cache for user:", userId);
      return true;
    } catch (error) {
      console.error("[LocalData] Error clearing cache:", error);
      return false;
    }
  }

  clearAll(): boolean {
    try {
      storage.clearAll();
      console.log("[LocalData] All cache cleared");
      return true;
    } catch (error) {
      console.error("[LocalData] Error clearing all cache:", error);
      return false;
    }
  }

  getDebugInfo(userId?: string): any {
    const info: any = {
      lastUserId: this.getLastUserId(),
      totalKeys: storage.getAllKeys().length,
      allKeys: storage.getAllKeys(),
      isHydrated,
      storageType: "AsyncStorage + Memory",
    };

    if (userId) {
      const key = this.userDataKey(userId);
      const raw = storage.getString(key);
      if (raw) {
        const data = JSON.parse(raw) as LocalUserData;
        info.userData = {
          tricksCount: data.tricks.length,
          categoriesCount: data.categories.length,
          lastSync: new Date(data.lastSync).toISOString(),
          version: data.version,
        };
      }
    }

    return info;
  }

  exportUserData(userId: string): string | null {
    const key = this.userDataKey(userId);
    const raw = storage.getString(key);
    return raw || null;
  }

  importUserData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString) as LocalUserData;
      return this.saveUserData(data);
    } catch (error) {
      console.error("[LocalData] Error importing data:", error);
      return false;
    }
  }
}
// ============================================================================
// CACHE PERSISTENTE EN MEMORIA (sobrevive a unmount/remount de componentes)
// ============================================================================

export interface CategorySection {
  category: LocalCategory;
  items: LocalTrick[];
  isExpanded?: boolean;
}

interface InMemoryCache {
  sections: CategorySection[] | null;
  categories: LocalCategory[] | null;
  userId: string | null;
  timestamp: number;
}

let inMemoryCache: InMemoryCache = {
  sections: null,
  categories: null,
  userId: null,
  timestamp: 0,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene el cache en memoria si es válido
 */
export function getInMemoryCache(userId: string): InMemoryCache | null {
  // Verificar que el cache sea del mismo usuario
  if (inMemoryCache.userId !== userId) {
    console.log("[InMemoryCache] User mismatch, clearing cache");
    clearInMemoryCache();
    return null;
  }

  // Verificar que no esté expirado
  const age = Date.now() - inMemoryCache.timestamp;
  if (age > CACHE_TTL) {
    console.log("[InMemoryCache] Cache expired, clearing");
    clearInMemoryCache();
    return null;
  }

  // Verificar que tenga datos
  if (!inMemoryCache.sections || !inMemoryCache.categories) {
    return null;
  }

  console.log(
    `[InMemoryCache] Hit! ${inMemoryCache.sections.length} sections (age: ${Math.round(age / 1000)}s)`
  );

  return inMemoryCache;
}

/**
 * Guarda datos en el cache en memoria
 */
export function setInMemoryCache(
  userId: string,
  sections: CategorySection[],
  categories: LocalCategory[]
): void {
  inMemoryCache = {
    sections,
    categories,
    userId,
    timestamp: Date.now(),
  };
  console.log(`[InMemoryCache] Saved: ${sections.length} sections`);
}

/**
 * Limpia el cache en memoria
 */
export function clearInMemoryCache(): void {
  inMemoryCache = {
    sections: null,
    categories: null,
    userId: null,
    timestamp: 0,
  };
  console.log("[InMemoryCache] Cleared");
}

export const localDataService = LocalDataService.getInstance();
