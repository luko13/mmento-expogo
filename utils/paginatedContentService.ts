// utils/paginatedContentService.ts - mem cache + MMKV snapshot + logs
import { supabase } from "../lib/supabase";
import { MMKV } from "react-native-mmkv";
import { Category, Trick, Technique, Gimmick } from "./categoryService";

export interface SearchFilters {
  categories?: string[];
  tags?: string[];
  tagsMode?: "and" | "or";
  difficulties?: number[];
  resetTimes?: { min?: number; max?: number };
  durations?: { min?: number; max?: number };
  angles?: string[];
  isPublic?: boolean | null;
  sortOrder?: "recent" | "last";
}

export interface PaginatedContent {
  categories: Category[];
  tricks: Trick[];
  techniques: Technique[];
  gimmicks: Gimmick[];
  sharedContent: any[];
  hasMore: boolean;
  nextPage: number;
}

type CacheValue = PaginatedContent;

// ---------- MMKV (v2) ----------
const storage = new MMKV({ id: "mmento-cache" });

export class PaginatedContentService {
  private static instance: PaginatedContentService;
  private memCache = new Map<string, CacheValue>(); // cache en memoria del proceso
  private readonly PAGE_SIZE = 20;

  static getInstance(): PaginatedContentService {
    if (!PaginatedContentService.instance) {
      PaginatedContentService.instance = new PaginatedContentService();
    }
    return PaginatedContentService.instance;
  }

  // -------------------- Keys --------------------
  private key(
    userId: string,
    page: number,
    categoryIds?: string[] | string,
    q?: string,
    f?: SearchFilters
  ) {
    const cats = Array.isArray(categoryIds)
      ? categoryIds.join(",")
      : categoryIds || "all";
    const queryKey = q || "no-query";
    const filterKey = f ? JSON.stringify(f) : "no-filters";
    return `${userId}|p=${page}|cats=${cats}|q=${queryKey}|f=${filterKey}`;
  }
  private snapshotKey(
    userId: string,
    page: number,
    categoryIds?: string[] | string,
    q?: string,
    f?: SearchFilters
  ) {
    const cats = Array.isArray(categoryIds)
      ? categoryIds.join(",")
      : categoryIds || "all";
    const queryKey = q || "no-query";
    const filterKey = f ? JSON.stringify(f) : "no-filters";
    return `snapshot:${userId}:${cats}:${queryKey}:${filterKey}`;
  }

  // -------------------- Snapshot helpers (MMKV) --------------------
  async getSnapshot(
    userId: string,
    page: number,
    categoryIds?: string[] | string,
    q?: string,
    f?: SearchFilters
  ) {
    const k = this.snapshotKey(userId, page, categoryIds, q, f);
    console.log("[PAGINATED] getSnapshot key =", k);

    // 1) intenta mem cache directa del key normal
    const mem = this.memCache.get(this.key(userId, page, categoryIds, q, f));
    if (mem) {
      console.log("[PAGINATED] getSnapshot hit = true (mem)");
      return mem;
    }

    // 2) intenta MMKV (instantáneo, sync)
    try {
      const raw = storage.getString(k);
      if (raw) {
        const data: PaginatedContent = JSON.parse(raw);
        console.log("[PAGINATED] getSnapshot hit = true (mmkv)");
        return data;
      }
    } catch (e) {
      console.log("[PAGINATED] getSnapshot mmkv error", e);
    }
    console.log("[PAGINATED] getSnapshot miss");
    return null;
  }

  async saveSnapshot(
    userId: string,
    page: number,
    categoryIds: string[] | string | undefined,
    q: string | undefined,
    f: SearchFilters | undefined,
    value: PaginatedContent
  ) {
    const k = this.key(userId, page, categoryIds, q, f);
    const sKey = this.snapshotKey(userId, page, categoryIds, q, f);
    this.memCache.set(k, value);
    try {
      storage.set(sKey, JSON.stringify(value));
      console.log("[PAGINATED] saveSnapshot done", sKey);
    } catch (e) {
      console.log("[PAGINATED] saveSnapshot error", e);
    }
  }

  // -------------------- Public API --------------------
  async getUserContentPaginated(
    userId: string,
    page: number = 0,
    categoryIds?: string[],
    searchQuery?: string,
    filters?: SearchFilters
  ): Promise<PaginatedContent> {
    const cacheKey = this.key(userId, page, categoryIds, searchQuery, filters);
    console.log("[PAGINATED] getUserContentPaginated cacheKey =", cacheKey);

    const mem = this.memCache.get(cacheKey);
    if (mem) {
      console.log("[PAGINATED] memCache hit = true");
      return mem;
    }

    try {
      const offset = page * this.PAGE_SIZE;
      const isFirstPage = page === 0;

      // Always get all categories
      const categoriesPromise = supabase
        .from("user_categories")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      // Build tricks query with filters
      let tricksQuery = supabase
        .from("magic_tricks")
        .select(`*, trick_categories(category_id), trick_tags(tag_id)`)
        .eq("user_id", userId);

      if (searchQuery) {
        tricksQuery = tricksQuery.or(
          `title.ilike.%${searchQuery}%,effect.ilike.%${searchQuery}%,secret.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`
        );
      }

      if (filters?.isPublic !== undefined && filters.isPublic !== null) {
        tricksQuery = tricksQuery.eq("is_public", filters.isPublic);
      }
      if (filters?.difficulties?.length) {
        tricksQuery = tricksQuery.in("difficulty", filters.difficulties);
      }
      if (filters?.durations?.min !== undefined) {
        tricksQuery = tricksQuery.gte("duration", filters.durations.min);
      }
      if (filters?.durations?.max !== undefined) {
        tricksQuery = tricksQuery.lte("duration", filters.durations.max);
      }
      if (filters?.resetTimes?.min !== undefined) {
        tricksQuery = tricksQuery.gte("reset", filters.resetTimes.min);
      }
      if (filters?.resetTimes?.max !== undefined) {
        tricksQuery = tricksQuery.lte("reset", filters.resetTimes.max);
      }
      if (filters?.angles?.length) {
        const angleConditions = filters.angles
          .map((a) => `angles.cs.["${a}"]`)
          .join(",");
        tricksQuery = tricksQuery.or(angleConditions);
      }
      tricksQuery =
        filters?.sortOrder === "last"
          ? tricksQuery.order("created_at", { ascending: true })
          : tricksQuery.order("created_at", { ascending: false });

      if (!isFirstPage) {
        tricksQuery = tricksQuery.range(offset, offset + this.PAGE_SIZE - 1);
      }

      // If filtering by categories (multiple)
      if (categoryIds && categoryIds.length > 0) {
        const allTrickIds: string[] = [];
        for (const catId of categoryIds) {
          const ids = await this.getItemIdsByCategory(
            "trick_categories",
            "trick_id",
            catId,
            0,
            10000
          );
          allTrickIds.push(...ids);
        }
        const uniqueTrickIds = [...new Set(allTrickIds)];
        if (uniqueTrickIds.length > 0) {
          tricksQuery = supabase
            .from("magic_tricks")
            .select(`*, trick_categories(category_id), trick_tags(tag_id)`)
            .in("id", uniqueTrickIds);

          if (searchQuery) {
            tricksQuery = tricksQuery.or(
              `title.ilike.%${searchQuery}%,effect.ilike.%${searchQuery}%,secret.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`
            );
          }
          if (filters?.isPublic !== undefined && filters.isPublic !== null) {
            tricksQuery = tricksQuery.eq("is_public", filters.isPublic);
          }
          if (filters?.difficulties?.length) {
            tricksQuery = tricksQuery.in("difficulty", filters.difficulties);
          }
          if (filters?.durations?.min !== undefined) {
            tricksQuery = tricksQuery.gte("duration", filters.durations.min);
          }
          if (filters?.durations?.max !== undefined) {
            tricksQuery = tricksQuery.lte("duration", filters.durations.max);
          }
          if (filters?.resetTimes?.min !== undefined) {
            tricksQuery = tricksQuery.gte("reset", filters.resetTimes.min);
          }
          if (filters?.resetTimes?.max !== undefined) {
            tricksQuery = tricksQuery.lte("reset", filters.resetTimes.max);
          }
          if (filters?.angles?.length) {
            const angleConditions = filters.angles
              .map((a) => `angles.cs.["${a}"]`)
              .join(",");
            tricksQuery = tricksQuery.or(angleConditions);
          }
          tricksQuery =
            filters?.sortOrder === "last"
              ? tricksQuery.order("created_at", { ascending: true })
              : tricksQuery.order("created_at", { ascending: false });
        } else {
          tricksQuery = supabase
            .from("magic_tricks")
            .select(`*, trick_categories(category_id), trick_tags(tag_id)`)
            .in("id", ["none"]);
        }
      }

      const [categoriesResult, tricksResult] = await Promise.all([
        categoriesPromise,
        tricksQuery,
      ]);
      const tricks = tricksResult.data || [];

      // Post-filter tags
      let filteredTricks = tricks;
      if (filters?.tags?.length) {
        filteredTricks = tricks.filter((trick) => {
          const trickTagIds =
            trick.trick_tags?.map((tt: any) => tt.tag_id) || [];
          return filters.tagsMode === "and"
            ? filters.tags!.every((tagId) => trickTagIds.includes(tagId))
            : filters.tags!.some((tagId) => trickTagIds.includes(tagId));
        });
      }

      const isFirst = page === 0;
      const hasMore = isFirst
        ? false
        : filteredTricks.length === this.PAGE_SIZE;

      const result: PaginatedContent = {
        categories: categoriesResult.data || [],
        tricks: filteredTricks,
        techniques: [],
        gimmicks: [],
        sharedContent: [],
        hasMore,
        nextPage: page + 1,
      };

      // cache & snapshot
      this.memCache.set(cacheKey, result);
      await this.saveSnapshot(
        userId,
        page,
        categoryIds,
        searchQuery,
        filters,
        result
      );

      // limpiar caché si crece mucho
      if (this.memCache.size > 100) {
        const firstKey = this.memCache.keys().next().value;
        if (firstKey) this.memCache.delete(firstKey);
      }

      return result;
    } catch (error) {
      console.error("Error fetching paginated content:", error);
      return {
        categories: [],
        tricks: [],
        techniques: [],
        gimmicks: [],
        sharedContent: [],
        hasMore: false,
        nextPage: page + 1,
      };
    }
  }

  // Helpers
  private async getItemIdsByCategory(
    tableName: string,
    idColumn: string,
    categoryId: string,
    offset: number,
    limit: number
  ): Promise<string[]> {
    const { data, error } = await supabase
      .from(tableName)
      .select(idColumn)
      .eq("category_id", categoryId)
      .range(offset, offset + limit - 1);

    if (error || !data) return [];
    return data.map((item: any) => item[idColumn]);
  }

  // Cache clearing
  clearUserCache(userId: string) {
    const keysToDelete: string[] = [];
    for (const [key] of this.memCache) {
      if (key.startsWith(userId)) keysToDelete.push(key);
    }
    keysToDelete.forEach((k) => this.memCache.delete(k));
    console.log(
      `🧹 Mem cache cleared for user ${userId}: ${keysToDelete.length} entries`
    );
    // No borramos MMKV para conservar snapshot de arranque rápido
  }

  clearAllCache() {
    const size = this.memCache.size;
    this.memCache.clear();
    console.log(`🧹 All mem cache cleared: ${size} entries`);
  }

  getCacheSize(): number {
    return this.memCache.size;
  }
}

export const paginatedContentService = PaginatedContentService.getInstance();
