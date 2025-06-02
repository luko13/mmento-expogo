// utils/paginatedContentService.ts
import { supabase } from "../lib/supabase";
import { Category, Trick, Technique, Gimmick } from "./categoryService";

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
   * Obtener contenido paginado
   */
  async getUserContentPaginated(
    userId: string, 
    page: number = 0,
    categoryId?: string
  ): Promise<PaginatedContent> {
    const cacheKey = `${userId}-${page}-${categoryId || 'all'}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const offset = page * this.PAGE_SIZE;
      
      // Always get all categories (they're usually few)
      const categoriesPromise = supabase
        .from("user_categories")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      // Build dynamic queries based on category filter
      let tricksQuery = supabase
        .from("magic_tricks")
        .select(`
          *,
          trick_categories(category_id),
          trick_tags(tag_id)
        `)
        .eq("user_id", userId)
        .range(offset, offset + this.PAGE_SIZE - 1)
        .order("created_at", { ascending: false });

      let techniquesQuery = supabase
        .from("techniques")
        .select(`
          *,
          technique_categories!technique_categories_technique_id_fkey(category_id),
          technique_tags(tag_id)
        `)
        .eq("user_id", userId)
        .range(offset, offset + this.PAGE_SIZE - 1)
        .order("created_at", { ascending: false });

      let gimmicksQuery = supabase
        .from("gimmicks")
        .select(`
          *,
          gimmick_categories!gimmick_categories_gimmick_id_fkey(category_id)
        `)
        .eq("user_id", userId)
        .range(offset, offset + this.PAGE_SIZE - 1)
        .order("created_at", { ascending: false });

      // If filtering by category, we need a different approach
      if (categoryId) {
        // Get IDs first, then fetch the actual items
        const [trickIds, techniqueIds, gimmickIds] = await Promise.all([
          this.getItemIdsByCategory('trick_categories', 'trick_id', categoryId, offset, this.PAGE_SIZE),
          this.getItemIdsByCategory('technique_categories', 'technique_id', categoryId, offset, this.PAGE_SIZE),
          this.getItemIdsByCategory('gimmick_categories', 'gimmick_id', categoryId, offset, this.PAGE_SIZE)
        ]);

        if (trickIds.length > 0) {
          tricksQuery = supabase
            .from("magic_tricks")
            .select(`*, trick_categories(category_id), trick_tags(tag_id)`)
            .in("id", trickIds);
        }

        if (techniqueIds.length > 0) {
          techniquesQuery = supabase
            .from("techniques")
            .select(`*, technique_categories!technique_categories_technique_id_fkey(category_id), technique_tags(tag_id)`)
            .in("id", techniqueIds);
        }

        if (gimmickIds.length > 0) {
          gimmicksQuery = supabase
            .from("gimmicks")
            .select(`*, gimmick_categories!gimmick_categories_gimmick_id_fkey(category_id)`)
            .in("id", gimmickIds);
        }
      }

      // Execute all queries in parallel
      const [
        categoriesResult,
        tricksResult,
        techniquesResult,
        gimmicksResult,
        sharedResult
      ] = await Promise.all([
        categoriesPromise,
        tricksQuery,
        techniquesQuery,
        gimmicksQuery,
        supabase
          .from("shared_content")
          .select(`
            *,
            profiles!shared_content_owner_id_fkey (
              id,
              username,
              avatar_url
            )
          `)
          .eq("shared_with", userId)
          .range(offset, offset + this.PAGE_SIZE - 1)
      ]);

      const tricks = tricksResult.data || [];
      const techniques = techniquesResult.data || [];
      const gimmicks = gimmicksResult.data || [];
      
      // Debug log
      console.log('📦 PaginatedContentService - Raw data:', {
        firstTrick: tricks[0],
        firstTechnique: techniques[0],
        tricksWithTitle: tricks.filter((t: any) => t.title).length,
        tricksTotal: tricks.length
      });
      
      // Check if there's more content
      const totalItems = tricks.length + techniques.length + gimmicks.length;
      const hasMore = totalItems === this.PAGE_SIZE;

      const result: PaginatedContent = {
        categories: categoriesResult.data || [],
        tricks,
        techniques,
        gimmicks,
        sharedContent: sharedResult.data || [],
        hasMore,
        nextPage: page + 1
      };

      // Cache result
      this.cache.set(cacheKey, result);
      
      // Clear old cache entries if too many
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
        nextPage: page + 1
      };
    }
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
    for (const [key] of this.cache) {
      if (key.startsWith(userId)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Prefetch next page
   */
  async prefetchNextPage(userId: string, currentPage: number, categoryId?: string) {
    // Fire and forget
    this.getUserContentPaginated(userId, currentPage + 1, categoryId).catch(() => {});
  }
}

export const paginatedContentService = PaginatedContentService.getInstance();