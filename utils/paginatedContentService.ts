// utils/paginatedContentService.ts - Versión actualizada con filtros
import { supabase } from "../lib/supabase";
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

export class PaginatedContentService {
  private static instance: PaginatedContentService;
  private cache = new Map<string, PaginatedContent>();
  private readonly PAGE_SIZE = 20;

  static getInstance(): PaginatedContentService {
    if (!PaginatedContentService.instance) {
      PaginatedContentService.instance = new PaginatedContentService();
    }
    return PaginatedContentService.instance;
  }

  /**
   * Generar clave de caché que incluya los filtros
   */
  private getCacheKey(
    userId: string,
    page: number,
    categoryId?: string,
    searchQuery?: string,
    filters?: SearchFilters
  ): string {
    const filterKey = filters ? JSON.stringify(filters) : "no-filters";
    const queryKey = searchQuery || "no-query";
    return `${userId}-${page}-${categoryId || "all"}-${queryKey}-${filterKey}`;
  }

  /**
   * Obtener contenido paginado con filtros
   */
  async getUserContentPaginated(
    userId: string,
    page: number = 0,
    categoryIds?: string[], // Cambiar a array para múltiples categorías
    searchQuery?: string,
    filters?: SearchFilters
  ): Promise<PaginatedContent> {
    const cacheKey = this.getCacheKey(
      userId,
      page,
      categoryIds?.join(","),
      searchQuery,
      filters
    );

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

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
        .select(
          `
          *,
          trick_categories(category_id),
          trick_tags(tag_id)
        `
        )
        .eq("user_id", userId);

      // Apply search query
      if (searchQuery) {
        tricksQuery = tricksQuery.or(
          `title.ilike.%${searchQuery}%,effect.ilike.%${searchQuery}%,secret.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`
        );
      }

      // Apply public/private filter
      if (filters?.isPublic !== undefined && filters.isPublic !== null) {
        tricksQuery = tricksQuery.eq("is_public", filters.isPublic);
      }

      // Apply difficulty filter
      if (filters?.difficulties?.length) {
        tricksQuery = tricksQuery.in("difficulty", filters.difficulties);
      }

      // Apply duration filters
      if (filters?.durations?.min !== undefined) {
        tricksQuery = tricksQuery.gte("duration", filters.durations.min);
      }
      if (filters?.durations?.max !== undefined) {
        tricksQuery = tricksQuery.lte("duration", filters.durations.max);
      }

      // Apply reset time filters
      if (filters?.resetTimes?.min !== undefined) {
        tricksQuery = tricksQuery.gte("reset", filters.resetTimes.min);
      }
      if (filters?.resetTimes?.max !== undefined) {
        tricksQuery = tricksQuery.lte("reset", filters.resetTimes.max);
      }

      // Apply angles filter
      if (filters?.angles?.length) {
        // Construir condiciones para verificar si el array JSONB contiene alguno de los ángulos seleccionados
        const angleConditions = filters.angles
          .map((angle) => `angles.cs.["${angle}"]`)
          .join(",");

        tricksQuery = tricksQuery.or(angleConditions);
      }

      // Apply sort order
      if (filters?.sortOrder === "last") {
        tricksQuery = tricksQuery.order("created_at", { ascending: true });
      } else {
        tricksQuery = tricksQuery.order("created_at", { ascending: false });
      }

      // Apply pagination
      if (!isFirstPage) {
        tricksQuery = tricksQuery.range(offset, offset + this.PAGE_SIZE - 1);
      }

      // Handle category filters - múltiples categorías
      if (categoryIds && categoryIds.length > 0) {
        const allTrickIds: string[] = [];

        // Obtener IDs de trucos para cada categoría
        for (const catId of categoryIds) {
          const ids = await this.getItemIdsByCategory(
            "trick_categories",
            "trick_id",
            catId,
            0,
            10000 // Obtener todos
          );
          allTrickIds.push(...ids);
        }

        // Eliminar duplicados
        const uniqueTrickIds = [...new Set(allTrickIds)];

        if (uniqueTrickIds.length > 0) {
          tricksQuery = supabase
            .from("magic_tricks")
            .select(`*, trick_categories(category_id), trick_tags(tag_id)`)
            .in("id", uniqueTrickIds);

          // Re-aplicar todos los filtros
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
            // Usar filtro contains para JSONB
            const angleConditions = filters.angles
              .map((angle) => `angles.cs.["${angle}"]`)
              .join(",");
            tricksQuery = tricksQuery.or(angleConditions);
          }
          if (filters?.sortOrder === "last") {
            tricksQuery = tricksQuery.order("created_at", { ascending: true });
          } else {
            tricksQuery = tricksQuery.order("created_at", { ascending: false });
          }
        } else {
          tricksQuery = supabase
            .from("magic_tricks")
            .select(`*, trick_categories(category_id), trick_tags(tag_id)`)
            .in("id", ["none"]);
        }
      }

      // Execute queries
      const [categoriesResult, tricksResult] = await Promise.all([
        categoriesPromise,
        tricksQuery,
      ]);

      const tricks = tricksResult.data || [];

      // Apply tags filter in post-processing if needed
      let filteredTricks = tricks;
      if (filters?.tags?.length) {
        filteredTricks = tricks.filter((trick) => {
          const trickTagIds =
            trick.trick_tags?.map((tt: any) => tt.tag_id) || [];

          if (filters.tagsMode === "and") {
            // ALL selected tags must be present
            return filters.tags!.every((tagId) => trickTagIds.includes(tagId));
          } else {
            // ANY selected tag must be present (default "or" mode)
            return filters.tags!.some((tagId) => trickTagIds.includes(tagId));
          }
        });
      }

      const hasMore = isFirstPage
        ? false
        : filteredTricks.length === this.PAGE_SIZE;

      const result: PaginatedContent = {
        categories: categoriesResult.data || [],
        tricks: filteredTricks,
        techniques: [], // Por ahora vacío
        gimmicks: [], // Por ahora vacío
        sharedContent: [], // Por ahora vacío
        hasMore,
        nextPage: page + 1,
      };

      // Cache result
      this.cache.set(cacheKey, result);

      // Clean old cache if needed
      if (this.cache.size > 50) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
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

  /**
   * Helper mejorado para obtener IDs filtrados
   */
  private async getFilteredItemIdsByCategory(
    tableName: string,
    idColumn: string,
    categoryId: string,
    baseQuery: any
  ): Promise<string[]> {
    const { data, error } = await supabase
      .from(tableName)
      .select(idColumn)
      .eq("category_id", categoryId);

    if (error || !data) return [];
    return data.map((item: any) => item[idColumn]);
  }

  /**
   * Helper to get item IDs by category with pagination
   */
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

  /**
   * Clear cache for a user
   */
  clearUserCache(userId: string) {
    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      if (key.startsWith(userId)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
    });

    console.log(
      `🧹 Cache cleared for user ${userId}: ${keysToDelete.length} entries`
    );
  }

  clearAllCache() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 All cache cleared: ${size} entries`);
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

export const paginatedContentService = PaginatedContentService.getInstance();
