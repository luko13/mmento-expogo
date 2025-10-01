// hooks/useLibraryData.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import {
  localDataService,
  type LocalCategory,
  type LocalTrick,
  type CategorySection,
  getInMemoryCache,
  setInMemoryCache,
} from "../services/LocalDataService";
import { supabaseDataService } from "../services/SupabaseDataService";
import type { SearchFilters } from "../components/home/CompactSearchBar";


// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export function useLibraryData(
  searchQuery: string = "",
  searchFilters?: SearchFilters
) {
  // Estados
  const [sections, setSections] = useState<CategorySection[]>([]);
  const [allCategories, setAllCategories] = useState<LocalCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Refs para subscripciones
  const channelRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const hasLoadedRef = useRef(false);

  // --------------------------------------------------------------------------
  // FUNCIÓN: buildSections
  // --------------------------------------------------------------------------
  const buildSections = useCallback(
    (
      categories: LocalCategory[],
      tricks: LocalTrick[],
      query: string,
      filters?: SearchFilters
    ): CategorySection[] => {
      const normalizedQuery = query.toLowerCase().trim();
      let filteredTricks = tricks;

      // 1. Búsqueda por texto
      if (normalizedQuery) {
        filteredTricks = filteredTricks.filter((trick) => {
          const title = trick.title?.toLowerCase() || "";
          const effect = trick.effect?.toLowerCase() || "";
          const secret = trick.secret?.toLowerCase() || "";
          return (
            title.includes(normalizedQuery) ||
            effect.includes(normalizedQuery) ||
            secret.includes(normalizedQuery)
          );
        });
      }

      // 2. Filtros de categorías
      if (filters?.categories && filters.categories.length > 0) {
        filteredTricks = filteredTricks.filter((trick) =>
          trick.category_ids.some((catId) =>
            filters.categories!.includes(catId)
          )
        );
      }

      // 3. Filtros de dificultad
      if (filters?.difficulties && filters.difficulties.length > 0) {
        filteredTricks = filteredTricks.filter((trick) =>
          trick.difficulty !== null
            ? filters.difficulties.includes(trick.difficulty)
            : false
        );
      }

      // 4. Filtros de duración
      if (filters?.durations) {
        const { min, max } = filters.durations;
        if (min !== undefined || max !== undefined) {
          filteredTricks = filteredTricks.filter((trick) => {
            if (trick.duration === null) return false;
            if (min !== undefined && trick.duration < min) return false;
            if (max !== undefined && trick.duration > max) return false;
            return true;
          });
        }
      }

      // Crear categoría de Favoritos
      const favoritesCategory: LocalCategory = {
        id: "favorites-virtual",
        name: "Favoritos",
        description: null,
        user_id: currentUserId || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const favoriteTricks = filteredTricks.filter((t) => t.is_favorite);
      const categoryMap = new Map<string, CategorySection>();

      if (favoriteTricks.length > 0) {
        categoryMap.set("favorites-virtual", {
          category: favoritesCategory,
          items: favoriteTricks,
        });
      }

      categories.forEach((cat) => {
        const tricksInCategory = filteredTricks.filter((trick) =>
          trick.category_ids.includes(cat.id)
        );

        if (tricksInCategory.length > 0) {
          categoryMap.set(cat.id, {
            category: cat,
            items: tricksInCategory,
          });
        }
      });

      const result = Array.from(categoryMap.values());

      result.sort((a, b) => {
        const aIsFav = a.category.id === "favorites-virtual";
        const bIsFav = b.category.id === "favorites-virtual";
        if (aIsFav && !bIsFav) return -1;
        if (!aIsFav && bIsFav) return 1;
        return a.category.name.localeCompare(b.category.name);
      });

      return result;
    },
    [currentUserId]
  );

  // --------------------------------------------------------------------------
  // FUNCIÓN: loadData
  // --------------------------------------------------------------------------
  const loadData = useCallback(
    async (userId: string, forceNetwork: boolean = false) => {
      try {
        console.log("[useLibraryData] Loading data for user:", userId);

        if (!forceNetwork) {
          console.log("[useLibraryData] Hydrating from cache...");
          const cachedData = await localDataService.getUserData(userId);

          if (cachedData) {
            console.log("[useLibraryData] Cache hit!");
            const newSections = buildSections(
              cachedData.categories,
              cachedData.tricks,
              searchQuery,
              searchFilters
            );
            setSections(newSections);
            setAllCategories(cachedData.categories);
            setInitializing(false);
          } else {
            console.log("[useLibraryData] No cache found");
          }
        }

        console.log("[useLibraryData] Fetching from network...");
        setLoading(true);
        setError(null);

        try {
          const { categories, tricks } =
            await supabaseDataService.fetchAllUserData(userId);

          localDataService.saveUserData({
            userId,
            categories,
            tricks,
            lastSync: Date.now(),
            version: 2,
          });

          if (isMountedRef.current) {
            const newSections = buildSections(
              categories,
              tricks,
              searchQuery,
              searchFilters
            );
            setSections(newSections);
            setAllCategories(categories);
            setLoading(false);
            setInitializing(false);
          }

          console.log("[useLibraryData] Network fetch complete");
        } catch (networkError: any) {
          console.warn("[useLibraryData] Network error:", networkError.message);

          const cachedData = await localDataService.getUserData(userId);
          if (cachedData) {
            console.log("[useLibraryData] Using offline mode with cache");
            if (isMountedRef.current) {
              setLoading(false);
              setInitializing(false);
            }
          } else {
            if (isMountedRef.current) {
              setError("No internet connection. Please try again later.");
              setLoading(false);
              setInitializing(false);
            }
          }
        }
      } catch (err: any) {
        console.error("[useLibraryData] Error loading data:", err);
        if (isMountedRef.current) {
          setError(err.message || "Error loading data");
          setLoading(false);
          setInitializing(false);
        }
      }
    },
    [searchQuery, searchFilters, buildSections]
  );

  // --------------------------------------------------------------------------
  // FUNCIÓN: refresh
  // --------------------------------------------------------------------------
  const refresh = useCallback(async () => {
    if (!currentUserId) return;
    await loadData(currentUserId, true);
  }, [currentUserId, loadData]);

  // --------------------------------------------------------------------------
  // FUNCIÓN: toggleFavorite
  // --------------------------------------------------------------------------
  const toggleFavorite = useCallback(
    async (trickId: string) => {
      if (!currentUserId) return;

      const cachedData = await localDataService.getUserData(currentUserId);
      if (!cachedData) return;

      const trick = cachedData.tricks.find((t) => t.id === trickId);
      if (!trick) return;

      localDataService.toggleFavorite(currentUserId, trickId);

      const updatedData = await localDataService.getUserData(currentUserId);
      if (updatedData) {
        const newSections = buildSections(
          updatedData.categories,
          updatedData.tricks,
          searchQuery,
          searchFilters
        );
        setSections(newSections);
      }

      try {
        await supabaseDataService.toggleFavorite(
          currentUserId,
          trickId,
          trick.is_favorite
        );
      } catch (err) {
        console.error("[useLibraryData] Error toggling favorite:", err);
        localDataService.toggleFavorite(currentUserId, trickId);
        refresh();
      }
    },
    [currentUserId, searchQuery, searchFilters, buildSections, refresh]
  );

  // --------------------------------------------------------------------------
  // FUNCIÓN: createCategory
  // --------------------------------------------------------------------------
  const createCategory = useCallback(
    async (
      name: string,
      description?: string
    ): Promise<LocalCategory | null> => {
      if (!currentUserId) return null;

      try {
        const newCategory = await supabaseDataService.createCategory(
          currentUserId,
          name,
          description
        );

        if (newCategory) {
          localDataService.addCategory(currentUserId, newCategory);
          await refresh();
        }

        return newCategory;
      } catch (err) {
        console.error("[useLibraryData] Error creating category:", err);
        return null;
      }
    },
    [currentUserId, refresh]
  );

  // --------------------------------------------------------------------------
  // FUNCIÓN: updateCategory
  // --------------------------------------------------------------------------
  const updateCategory = useCallback(
    async (
      categoryId: string,
      name: string,
      description?: string
    ): Promise<boolean> => {
      if (!currentUserId) return false;

      try {
        const success = await supabaseDataService.updateCategory(categoryId, {
          name,
          description,
        });

        if (success) {
          localDataService.updateCategory(currentUserId, categoryId, {
            name,
            description: description || null,
          });
          await refresh();
        }

        return success;
      } catch (err) {
        console.error("[useLibraryData] Error updating category:", err);
        return false;
      }
    },
    [currentUserId, refresh]
  );

  // --------------------------------------------------------------------------
  // FUNCIÓN: deleteCategory
  // --------------------------------------------------------------------------
  const deleteCategory = useCallback(
    async (categoryId: string): Promise<boolean> => {
      if (!currentUserId) return false;

      try {
        const success = await supabaseDataService.deleteCategory(categoryId);

        if (success) {
          localDataService.deleteCategory(currentUserId, categoryId);
          await refresh();
        }

        return success;
      } catch (err) {
        console.error("[useLibraryData] Error deleting category:", err);
        return false;
      }
    },
    [currentUserId, refresh]
  );

  // --------------------------------------------------------------------------
  // EFFECT: Carga inicial
  // --------------------------------------------------------------------------
  useEffect(() => {
    isMountedRef.current = true;

    (async () => {
      if (hasLoadedRef.current) {
        console.log(
          "[useLibraryData] Already loaded, skipping duplicate mount"
        );
        return;
      }
      hasLoadedRef.current = true;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setCurrentUserId(user.id);

          // Intentar usar cache persistente primero
          const memCache = getInMemoryCache(user.id);
          if (memCache?.sections && memCache?.categories) {
            console.log("[useLibraryData] Using persistent in-memory cache");
            setSections(memCache.sections);
            setAllCategories(memCache.categories);
            setInitializing(false);
            setLoading(false);

            // Hacer fetch en background para actualizar
            await loadData(user.id, false);
          } else {
            // Sin cache persistente, carga normal
            await loadData(user.id, false);
          }
        } else {
          setInitializing(false);
        }
      } catch (err) {
        console.error("[useLibraryData] Mount error:", err);
        setInitializing(false);
      }
    })();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // --------------------------------------------------------------------------
  // EFFECT: Realtime subscriptions
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!currentUserId) return;

    console.log("[useLibraryData] Setting up realtime subscriptions...");

    const channel = supabase
      .channel(`user_library_${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "magic_tricks",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log(
            "[useLibraryData] Realtime: magic_tricks changed",
            payload
          );
          refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_categories",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log(
            "[useLibraryData] Realtime: user_categories changed",
            payload
          );
          refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trick_categories",
        },
        (payload) => {
          console.log(
            "[useLibraryData] Realtime: trick_categories changed",
            payload
          );
          refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_favorites",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log(
            "[useLibraryData] Realtime: user_favorites changed",
            payload
          );
          refresh();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      console.log("[useLibraryData] Cleaning up realtime subscriptions");
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentUserId, refresh]);

  // --------------------------------------------------------------------------
  // EFFECT: Rebuild sections cuando cambian búsqueda/filtros
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!currentUserId) return;
    if (initializing || loading) return;
    if (sections.length === 0) return;

    (async () => {
      const cachedData = await localDataService.getUserData(currentUserId);
      if (cachedData) {
        console.log("[useLibraryData] Rebuilding sections with new filters");
        const newSections = buildSections(
          cachedData.categories,
          cachedData.tricks,
          searchQuery,
          searchFilters
        );
        setSections(newSections);

        // Guardar en cache persistente
        setInMemoryCache(currentUserId, newSections, cachedData.categories);
      }
    })();
  }, [searchQuery, searchFilters]);

  // Guardar en cache persistente cada vez que cambian los sections
  useEffect(() => {
    if (currentUserId && sections.length > 0 && allCategories.length > 0) {
      setInMemoryCache(currentUserId, sections, allCategories);
    }
  }, [sections, allCategories, currentUserId]);

  // --------------------------------------------------------------------------
  // RETURN
  // --------------------------------------------------------------------------
  return {
    sections,
    allCategories,
    loading,
    initializing,
    error,
    refresh,
    toggleFavorite,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
