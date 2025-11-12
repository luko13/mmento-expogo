// services/SupabaseDataService.ts
import { supabase } from "../lib/supabase";
import type { LocalTrick, LocalCategory } from "./LocalDataService";

export class SupabaseDataService {
  private static instance: SupabaseDataService;

  static getInstance(): SupabaseDataService {
    if (!SupabaseDataService.instance) {
      SupabaseDataService.instance = new SupabaseDataService();
    }
    return SupabaseDataService.instance;
  }

  // --------------------------------------------------------------------------
  // FETCH COMPLETO (para primera carga o refresh total)
  // --------------------------------------------------------------------------

  async fetchAllUserData(userId: string): Promise<{
    categories: LocalCategory[];
    tricks: LocalTrick[];
  }> {
    try {
      

      const [categoriesResult, tricksResult, favoritesResult] =
        await Promise.all([
          this.fetchCategories(userId),
          this.fetchTricks(userId),
          this.fetchFavorites(userId),
        ]);

      const favoriteIds = new Set(favoritesResult);

      const tricksWithFavorites = tricksResult.map((trick) => ({
        ...trick,
        is_favorite: favoriteIds.has(trick.id),
      }));

      console.log(
        ` Fetched: ${tricksWithFavorites.length} tricks, ${categoriesResult.length} categories`
      );

      return {
        categories: categoriesResult,
        tricks: tricksWithFavorites,
      };
    } catch (error) {
      console.error(" Error fetching all data:", error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // FETCH INDIVIDUAL
  // --------------------------------------------------------------------------

  private async fetchCategories(userId: string): Promise<LocalCategory[]> {
    const { data, error } = await supabase
      .from("user_categories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (data || []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description || null,
      user_id: cat.user_id,
      created_at: cat.created_at,
      updated_at: cat.updated_at || cat.created_at,
    }));
  }

  private async fetchTricks(userId: string): Promise<LocalTrick[]> {
    const { data, error } = await supabase
      .from("magic_tricks")
      .select(
        `
        *,
        trick_categories(category_id),
        trick_tags(tag_id)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Cargar todas las fotos adicionales en una sola query optimizada
    const trickIds = (data || []).map((t) => t.id);
    const photosMap = new Map<string, string[]>();

    if (trickIds.length > 0) {
      const { data: photosData, error: photosError } = await supabase
        .from("trick_photos")
        .select("trick_id, photo_url")
        .in("trick_id", trickIds);

      if (photosError) {
        console.error(" Error fetching photos:", photosError);
      } else if (photosData) {
        photosData.forEach((p) => {
          if (!photosMap.has(p.trick_id)) {
            photosMap.set(p.trick_id, []);
          }
          photosMap.get(p.trick_id)!.push(p.photo_url);
        });
        console.log(
          ` Loaded photos for ${photosMap.size} tricks`
        );
      }
    }

    return (data || []).map((trick) => {
      // Parse angles si es string JSON
      let angles: string[] = [];
      if (Array.isArray(trick.angles)) {
        angles = trick.angles;
      } else if (typeof trick.angles === "string") {
        try {
          angles = JSON.parse(trick.angles);
        } catch {
          angles = [];
        }
      }

      const category_ids = (trick.trick_categories || []).map(
        (tc: any) => tc.category_id
      );

      const tag_ids = (trick.trick_tags || []).map((tt: any) => tt.tag_id);

      // Obtener fotos adicionales del map
      const photos = photosMap.get(trick.id) || [];

      return {
        id: trick.id,
        title: trick.title || "Sin título",
        effect: trick.effect || "",
        secret: trick.secret || "",
        duration: trick.duration ?? null,
        reset: trick.reset ?? null,
        difficulty: trick.difficulty ?? null,
        angles,
        notes: trick.notes || "",
        photo_url: trick.photo_url || null,
        effect_video_url: trick.effect_video_url || null,
        secret_video_url: trick.secret_video_url || null,
        is_public: trick.is_public ?? false,
        status: trick.status || "draft",
        created_at: trick.created_at,
        updated_at: trick.updated_at || trick.created_at,
        user_id: trick.user_id,
        category_ids,
        tag_ids,
        is_favorite: false,
        photos, // Array de URLs de fotos adicionales
      };
    });
  }

  private async fetchFavorites(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("user_favorites")
      .select("content_id")
      .eq("user_id", userId)
      .eq("content_type", "magic");

    if (error) {
      console.error(" Error fetching favorites:", error);
      return [];
    }

    return (data || []).map((f) => f.content_id);
  }

  // --------------------------------------------------------------------------
  // FETCH INCREMENTAL (solo cambios desde timestamp)
  // --------------------------------------------------------------------------

  async fetchModifiedSince(
    userId: string,
    since: number
  ): Promise<{
    categories: LocalCategory[];
    tricks: LocalTrick[];
    deletedTrickIds: string[];
    deletedCategoryIds: string[];
  }> {
    try {
      const sinceISO = new Date(since).toISOString();
      

      const { data: categoriesData } = await supabase
        .from("user_categories")
        .select("*")
        .eq("user_id", userId)
        .gte("updated_at", sinceISO);

      const { data: tricksData } = await supabase
        .from("magic_tricks")
        .select(
          `
          *,
          trick_categories(category_id),
          trick_tags(tag_id)
        `
        )
        .eq("user_id", userId)
        .gte("updated_at", sinceISO);

      const favoriteIds = new Set(await this.fetchFavorites(userId));

      // Cargar fotos para tricks modificados
      const trickIds = (tricksData || []).map((t) => t.id);
      const photosMap = new Map<string, string[]>();

      if (trickIds.length > 0) {
        const { data: photosData } = await supabase
          .from("trick_photos")
          .select("trick_id, photo_url")
          .in("trick_id", trickIds);

        if (photosData) {
          photosData.forEach((p) => {
            if (!photosMap.has(p.trick_id)) {
              photosMap.set(p.trick_id, []);
            }
            photosMap.get(p.trick_id)!.push(p.photo_url);
          });
        }
      }

      const tricks: LocalTrick[] = (tricksData || []).map((trick) => {
        let angles: string[] = [];
        if (Array.isArray(trick.angles)) angles = trick.angles;
        else if (typeof trick.angles === "string") {
          try {
            angles = JSON.parse(trick.angles);
          } catch {}
        }

        const photos = photosMap.get(trick.id) || [];

        return {
          id: trick.id,
          title: trick.title || "Sin título",
          effect: trick.effect || "",
          secret: trick.secret || "",
          duration: trick.duration ?? null,
          reset: trick.reset ?? null,
          difficulty: trick.difficulty ?? null,
          angles,
          notes: trick.notes || "",
          photo_url: trick.photo_url || null,
          effect_video_url: trick.effect_video_url || null,
          secret_video_url: trick.secret_video_url || null,
          is_public: trick.is_public ?? false,
          status: trick.status || "draft",
          created_at: trick.created_at,
          updated_at: trick.updated_at || trick.created_at,
          user_id: trick.user_id,
          category_ids: (trick.trick_categories || []).map(
            (tc: any) => tc.category_id
          ),
          tag_ids: (trick.trick_tags || []).map((tt: any) => tt.tag_id),
          is_favorite: favoriteIds.has(trick.id),
          photos,
        };
      });

      const categories: LocalCategory[] = (categoriesData || []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || null,
        user_id: cat.user_id,
        created_at: cat.created_at,
        updated_at: cat.updated_at || cat.created_at,
      }));

      console.log(
        ` Modified: ${tricks.length} tricks, ${categories.length} categories`
      );

      return {
        categories,
        tricks,
        deletedTrickIds: [],
        deletedCategoryIds: [],
      };
    } catch (error) {
      console.error(" Error fetching modified data:", error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // OPERACIONES INDIVIDUALES
  // --------------------------------------------------------------------------

  async createCategory(
    userId: string,
    name: string,
    description?: string
  ): Promise<LocalCategory | null> {
    try {
      const { data, error } = await supabase
        .from("user_categories")
        .insert({
          user_id: userId,
          name,
          description: description || null,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        description: data.description || null,
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at || data.created_at,
      };
    } catch (error) {
      console.error(" Error creating category:", error);
      return null;
    }
  }

  async updateCategory(
    categoryId: string,
    updates: { name?: string; description?: string }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_categories")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", categoryId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(" Error updating category:", error);
      return false;
    }
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(" Error deleting category:", error);
      return false;
    }
  }

  async toggleFavorite(
    userId: string,
    trickId: string,
    isFavorite: boolean
  ): Promise<boolean> {
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from("user_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("content_id", trickId)
          .eq("content_type", "magic");

        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_favorites").insert({
          user_id: userId,
          content_id: trickId,
          content_type: "magic",
        });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error(" Error toggling favorite:", error);
      return false;
    }
  }
}

export const supabaseDataService = SupabaseDataService.getInstance();
