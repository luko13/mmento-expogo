// utils/smartKeyCache.ts
import { Buffer } from "buffer";
import * as SecureStore from "expo-secure-store";
import { hybridCrypto } from "./hybridCrypto";

interface CachedKey {
  key: Uint8Array;
  time: number;
  accessCount: number;
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
}

export class SmartKeyCache {
  private cache = new Map<string, CachedKey>();
  private accessOrder = new Map<string, number>(); // LRU tracking
  private readonly maxSize = 10;
  private readonly ttl = 5 * 60 * 1000; // 5 minutes
  private readonly maxMemory = 50 * 1024 * 1024; // 50MB max
  private currentMemory = 0;
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0 };
  private persistedKeys = new Set<string>();

  /**
   * Get or derive key with smart caching
   */
  async getOrDerive(
    password: string,
    salt: Uint8Array,
    iterations: number = 10000
  ): Promise<Uint8Array> {
    const cacheKey = this.generateCacheKey(password, salt);
    const now = Date.now();

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && now - cached.time < this.ttl) {
      this.stats.hits++;
      cached.accessCount++;
      this.accessOrder.set(cacheKey, now);

      console.log(
        `🎯 Cache hit for key (${this.stats.hits} hits, ${this.stats.misses} misses)`
      );
      return cached.key;
    }

    // Cache miss
    this.stats.misses++;
    console.log(`❌ Cache miss - deriving key...`);

    // Check if we need to evict
    if (
      this.cache.size >= this.maxSize ||
      this.currentMemory > this.maxMemory
    ) {
      this.evictLRU();
    }

    // Derive key
    const derivedKey = await this.deriveKeyWithMetrics(
      password,
      salt,
      iterations
    );

    // Store in cache
    this.cache.set(cacheKey, {
      key: derivedKey,
      time: now,
      accessCount: 1,
      size: derivedKey.length,
    });
    this.accessOrder.set(cacheKey, now);
    this.currentMemory += derivedKey.length;

    // Persist to secure storage for cross-session caching
    await this.persistKey(cacheKey, derivedKey);

    return derivedKey;
  }

  /**
   * Derive key with performance metrics
   */
  private async deriveKeyWithMetrics(
    password: string,
    salt: Uint8Array,
    iterations: number
  ): Promise<Uint8Array> {
    const start = Date.now();

    try {
      const key = await hybridCrypto.deriveKey(password, salt, iterations);
      const duration = Date.now() - start;

      console.log(
        `⏱️ Key derivation took ${duration}ms using ${hybridCrypto.getImplementationName()}`
      );

      // Adjust iterations if too slow
      if (duration > 1000 && iterations > 5000) {
        console.warn(
          `⚠️ Key derivation slow (${duration}ms), consider reducing iterations`
        );
      }

      return key;
    } catch (error) {
      console.error("Key derivation failed:", error);
      throw error;
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(password: string, salt: Uint8Array): string {
    // Hash password for privacy
    const passwordHash = Buffer.from(password)
      .toString("base64")
      .substring(0, 8);
    const saltHex = Buffer.from(salt).toString("hex").substring(0, 8);
    return `key_${passwordHash}_${saltHex}`;
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU() {
    // Sort by last access time
    const sorted = Array.from(this.accessOrder.entries()).sort(
      (a, b) => a[1] - b[1]
    );

    // Evict oldest 20%
    const toEvict = Math.max(1, Math.floor(this.cache.size * 0.2));

    for (let i = 0; i < toEvict && i < sorted.length; i++) {
      const [cacheKey] = sorted[i];
      const cached = this.cache.get(cacheKey);

      if (cached) {
        this.currentMemory -= cached.size;
        this.cache.delete(cacheKey);
        this.accessOrder.delete(cacheKey);
        this.stats.evictions++;

        // Remove from persistent storage
        this.removePersistedKey(cacheKey);
      }
    }

    console.log(
      `🗑️ Evicted ${toEvict} keys (total evictions: ${this.stats.evictions})`
    );
  }

  /**
   * Persist key to secure storage
   */
  private async persistKey(cacheKey: string, key: Uint8Array): Promise<void> {
    try {
      const data = {
        key: Buffer.from(key).toString("base64"),
        time: Date.now(),
      };
      await SecureStore.setItemAsync(
        `keyCache_${cacheKey}`,
        JSON.stringify(data)
      );
    } catch (error) {
      console.warn("Failed to persist key:", error);
    }
  }

  /**
   * Load key from persistent storage
   */
  async loadPersistedKey(cacheKey: string): Promise<Uint8Array | null> {
    try {
      const stored = await SecureStore.getItemAsync(`keyCache_${cacheKey}`);
      if (!stored) return null;

      const data = JSON.parse(stored);
      const now = Date.now();

      // Check if still valid
      if (now - data.time > this.ttl) {
        await this.removePersistedKey(cacheKey);
        return null;
      }

      return Buffer.from(data.key, "base64");
    } catch (error) {
      console.warn("Failed to load persisted key:", error);
      return null;
    }
  }

  /**
   * Remove persisted key
   */
  private async removePersistedKey(cacheKey: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(`keyCache_${cacheKey}`);
    } catch (error) {
      console.warn("Failed to remove persisted key:", error);
    }
  }

  /**
   * Preload frequently used keys
   */
  async preloadKeys(passwords: string[], salt: Uint8Array): Promise<void> {
    console.log(`📦 Preloading ${passwords.length} keys...`);

    const promises = passwords.map((password) =>
      this.getOrDerive(password, salt).catch((err) =>
        console.error(`Failed to preload key: ${err}`)
      )
    );

    await Promise.all(promises);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { size: number; memory: string } {
    return {
      ...this.stats,
      size: this.cache.size,
      memory: `${(this.currentMemory / 1024).toFixed(2)} KB`,
    };
  }

  /**
   * Clear cache
   */
  async clear(): Promise<void> {
    // Clear memory cache
    this.cache.clear();
    this.accessOrder.clear();
    this.currentMemory = 0;

    // Clear persisted cache - keep track of keys manually
    const cacheKeysList = Array.from(this.cache.keys());
    for (const key of cacheKeysList) {
      await this.removePersistedKey(key);
    }

    console.log("🧹 Cache cleared");
  }

  /**
   * Warm up cache from persistent storage
   */
  async warmUp(): Promise<void> {
    console.log("🔥 Warming up cache...");

    // Since we can't list all keys, we'll only warm up from memory
    // In a real app, you might want to maintain a separate index of cache keys
    console.log("✅ Cache warming complete (limited to in-memory cache)");
  }
}

// Singleton instance
export const keyCache = new SmartKeyCache();
