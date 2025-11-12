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
      
    }
    isHydrated = true;
  } catch (error) {
    console.error(" Hydration error:", error);
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
      console.error(" AsyncStorage write error:", e)
    );
  },
  delete: (key: string): void => {
    memoryCache.delete(key);
    AsyncStorage.removeItem(key).catch((e) =>
      console.error(" AsyncStorage delete error:", e)
    );
  },
  clearAll: (): void => {
    memoryCache.clear();
    AsyncStorage.clear().catch((e) =>
      console.error(" AsyncStorage clear error:", e)
    );
  },
  getAllKeys: (): string[] => {
    return Array.from(memoryCache.keys());
  },
  contains: (key: string): boolean => {
    return memoryCache.has(key);
  },
};



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
  photos: string[]; // Array de URLs de fotos adicionales
  _pendingSync?: boolean; // Flag para indicar que está pendiente de sincronización
  _isLocalOnly?: boolean; // Flag para trucos creados offline que aún no existen en server
}

export interface LocalCategory {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  _pendingSync?: boolean; // Flag para indicar que está pendiente de sincronización
  _isLocalOnly?: boolean; // Flag para categorías creadas offline que aún no existen en server
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
        
        return null;
      }

      const data = JSON.parse(raw) as LocalUserData;

      if (
        !data.userId ||
        !Array.isArray(data.categories) ||
        !Array.isArray(data.tricks)
      ) {
        console.warn(" Invalid cache structure");
        return null;
      }

      console.log(
        ` Cache hit: ${data.tricks.length} tricks, ${data.categories.length} categories`
      );

      return data;
    } catch (error) {
      console.error(" Error reading cache:", error);
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
        ` Saved: ${validatedData.tricks.length} tricks, ${validatedData.categories.length} categories`
      );

      return true;
    } catch (error) {
      console.error(" Error saving cache:", error);
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

  addTrick(userId: string, trick: LocalTrick, isLocalOnly = false): boolean {
    const existing = memoryCache.get(this.userDataKey(userId));

    const trickToAdd = isLocalOnly
      ? { ...trick, _isLocalOnly: true, _pendingSync: true }
      : trick;

    if (!existing) {
      return this.saveUserData({
        userId,
        categories: [],
        tricks: [trickToAdd],
        lastSync: Date.now(),
        version: this.CURRENT_VERSION,
      });
    }

    const data = JSON.parse(existing) as LocalUserData;
    const exists = data.tricks.some((t) => t.id === trick.id);
    if (exists) {
      console.warn(" Trick already exists:", trick.id);
      return false;
    }

    return this.saveUserData({
      ...data,
      tricks: [...data.tricks, trickToAdd],
      lastSync: Date.now(),
    });
  }

  updateTrick(
    userId: string,
    trickId: string,
    updates: Partial<LocalTrick>,
    markPending = false
  ): boolean {
    const existing = memoryCache.get(this.userDataKey(userId));
    if (!existing) return false;

    const data = JSON.parse(existing) as LocalUserData;
    const updatedTricks = data.tricks.map((trick) =>
      trick.id === trickId
        ? {
            ...trick,
            ...updates,
            updated_at: new Date().toISOString(),
            _pendingSync: markPending ? true : trick._pendingSync
          }
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

  addCategory(userId: string, category: LocalCategory, isLocalOnly = false): boolean {
    const existing = memoryCache.get(this.userDataKey(userId));

    const categoryToAdd = isLocalOnly
      ? { ...category, _isLocalOnly: true, _pendingSync: true }
      : category;

    if (!existing) {
      return this.saveUserData({
        userId,
        categories: [categoryToAdd],
        tricks: [],
        lastSync: Date.now(),
        version: this.CURRENT_VERSION,
      });
    }

    const data = JSON.parse(existing) as LocalUserData;
    const exists = data.categories.some((c) => c.id === category.id);
    if (exists) {
      console.warn(" Category already exists:", category.id);
      return false;
    }

    return this.saveUserData({
      ...data,
      categories: [...data.categories, categoryToAdd],
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
      
      return true;
    } catch (error) {
      console.error(" Error clearing cache:", error);
      return false;
    }
  }

  clearAll(): boolean {
    try {
      storage.clearAll();
      
      return true;
    } catch (error) {
      console.error(" Error clearing all cache:", error);
      return false;
    }
  }

  // Métodos para offline sync
  getPendingTricks(userId: string): LocalTrick[] {
    const existing = memoryCache.get(this.userDataKey(userId));
    if (!existing) return [];

    const data = JSON.parse(existing) as LocalUserData;
    return data.tricks.filter((t) => t._pendingSync || t._isLocalOnly);
  }

  getPendingCategories(userId: string): LocalCategory[] {
    const existing = memoryCache.get(this.userDataKey(userId));
    if (!existing) return [];

    const data = JSON.parse(existing) as LocalUserData;
    return data.categories.filter((c) => c._pendingSync || c._isLocalOnly);
  }

  clearPendingFlags(userId: string, trickIds: string[], categoryIds: string[]): boolean {
    const existing = memoryCache.get(this.userDataKey(userId));
    if (!existing) return false;

    const data = JSON.parse(existing) as LocalUserData;

    const updatedTricks = data.tricks.map((trick) => {
      if (trickIds.includes(trick.id)) {
        const { _pendingSync, _isLocalOnly, ...rest } = trick;
        return rest as LocalTrick;
      }
      return trick;
    });

    const updatedCategories = data.categories.map((cat) => {
      if (categoryIds.includes(cat.id)) {
        const { _pendingSync, _isLocalOnly, ...rest } = cat;
        return rest as LocalCategory;
      }
      return cat;
    });

    return this.saveUserData({
      ...data,
      tricks: updatedTricks,
      categories: updatedCategories,
    });
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
        const pendingTricks = data.tricks.filter((t) => t._pendingSync || t._isLocalOnly);
        const pendingCategories = data.categories.filter((c) => c._pendingSync || c._isLocalOnly);

        info.userData = {
          tricksCount: data.tricks.length,
          categoriesCount: data.categories.length,
          pendingTricksCount: pendingTricks.length,
          pendingCategoriesCount: pendingCategories.length,
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
      console.error(" Error importing data:", error);
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

export function getInMemoryCache(userId: string): InMemoryCache | null {
  if (inMemoryCache.userId !== userId) {
    
    clearInMemoryCache();
    return null;
  }

  const age = Date.now() - inMemoryCache.timestamp;
  if (age > CACHE_TTL) {
    
    clearInMemoryCache();
    return null;
  }

  if (!inMemoryCache.sections || !inMemoryCache.categories) {
    return null;
  }

  console.log(
    `[InMemoryCache] Hit! ${
      inMemoryCache.sections.length
    } sections (age: ${Math.round(age / 1000)}s)`
  );

  return inMemoryCache;
}

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
  
}

export function clearInMemoryCache(): void {
  inMemoryCache = {
    sections: null,
    categories: null,
    userId: null,
    timestamp: 0,
  };
  
}

export const localDataService = LocalDataService.getInstance();
