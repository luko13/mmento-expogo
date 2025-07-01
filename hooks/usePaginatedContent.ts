// hooks/usePaginatedContent.ts
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { paginatedContentService } from "../utils/paginatedContentService";
import { supabase } from "../lib/supabase";

// ============================================================================
// función debounce para evitar múltiples llamadas rápidas
// ============================================================================
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };

  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
  };

  return debounced as T & { cancel: () => void };
}

// ============================================================================
// Tipos de datos
// ============================================================================
interface LibraryItem {
  id: string;
  title: string;
  type: "magic";
  difficulty?: number | null;
  status?: string;
  created_at?: string;
  duration?: number | null;
  category_id?: string;
  tags?: string[];
  description?: string;
  notes?: string;
  reset?: number | null;
  angles?: string[];
  is_shared?: boolean;
  owner_id?: string;
  is_favorite?: boolean;
  // Progress tracking fields
  effect_video_url?: string;
  effect?: string;
  secret_video_url?: string;
  secret?: string;
}

interface CategorySection {
  category: {
    id: string;
    name: string;
    [key: string]: any;
  };
  items: LibraryItem[];
}

interface SearchFilters {
  difficulties?: string[];
  tags?: string[];
  categories?: string[];
}

export function usePaginatedContent(
  searchQuery: string = "",
  searchFilters?: SearchFilters
) {
  // --------------------------------------------------------------------------
  // Estados principales
  // --------------------------------------------------------------------------
  const [sections, setSections] = useState<CategorySection[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [favoritesCategoryId, setFavoritesCategoryId] = useState<string | null>(
    null
  );

  // --------------------------------------------------------------------------
  // Refs para controlar el estado de montaje
  // --------------------------------------------------------------------------
  const isMounted = useRef<boolean>(true);

  // --------------------------------------------------------------------------
  // Convertir datos crudos a secciones organizadas por categoría
  // --------------------------------------------------------------------------
  const processContentIntoSections = useCallback(
    async (
      content: {
        categories: any[];
        tricks: any[];
        hasMore: boolean;
        nextPage: number;
      },
      query?: string,
      filters?: SearchFilters,
      userId?: string
    ): Promise<CategorySection[]> => {
      const sectionsMap = new Map<string, CategorySection>();

      // Get user favorites to mark items
      let userFavorites: Set<string> = new Set();
      if (userId) {
        const { data: favorites } = await supabase
          .from("user_favorites")
          .select("content_id")
          .eq("user_id", userId)
          .eq("content_type", "magic");

        if (favorites) {
          userFavorites = new Set(favorites.map((f) => f.content_id));
        }
      }

      // Sort categories to ensure Favoritos is first
      const sortedCategories = [...content.categories].sort((a, b) => {
        if (a.name === "Favoritos") return -1;
        if (b.name === "Favoritos") return 1;
        return 0;
      });

      sortedCategories.forEach((category) => {
        sectionsMap.set(category.id, {
          category,
          items: [],
        });
      });

      // Store favorites category ID
      const favCat = sortedCategories.find((c) => c.name === "Favoritos");
      if (favCat) {
        setFavoritesCategoryId(favCat.id);
      }

      // Process tricks
      content.tricks.forEach((trick) => {
        const isFavorite = userFavorites.has(trick.id);

        const item: LibraryItem = {
          id: trick.id,
          title: trick.title || "Sin título",
          type: "magic",
          difficulty: trick.difficulty,
          status: trick.status,
          created_at: trick.created_at,
          duration: trick.duration,
          tags: trick.trick_tags?.map((tt: any) => tt.tag_id) || [],
          reset: trick.reset,
          notes: trick.notes,
          angles: parseJsonSafely(trick.angles, []),
          owner_id: trick.user_id,
          is_favorite: isFavorite,
          // Add progress tracking fields
          category_id: trick.trick_categories?.[0]?.category_id,
          effect_video_url: trick.effect_video_url,
          effect: trick.effect,
          secret_video_url: trick.secret_video_url,
          secret: trick.secret,
        };

        if (!matchesFilters(item, query, filters)) return;

        // Add to regular categories
        trick.trick_categories?.forEach((tc: any) => {
          const section = sectionsMap.get(tc.category_id);
          if (section) {
            section.items.push(item);
          }
        });

        // Also add to favorites category if it's a favorite
        if (isFavorite && favCat) {
          const favSection = sectionsMap.get(favCat.id);
          if (favSection) {
            favSection.items.push(item);
          }
        }
      });

      return Array.from(sectionsMap.values());
    },
    []
  );

  // --------------------------------------------------------------------------
  // Debounce de búsqueda para no disparar loadContent en cada pulsación
  // --------------------------------------------------------------------------
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string, filters?: SearchFilters) => {
        setPage(0);
        setSections([]);
        loadContent(0, query, filters);
      }, 300),
    []
  );

  // --------------------------------------------------------------------------
  // 1) Efecto principal: carga inicial de contenido
  // --------------------------------------------------------------------------
  useEffect(() => {
    isMounted.current = true;

    if (!searchQuery && !searchFilters) {
      loadContent(0);
    }

    return () => {
      isMounted.current = false;
      debouncedSearch.cancel();
    };
  }, []);

  // --------------------------------------------------------------------------
  // 2) Efecto para disparar búsqueda cuando cambien query o filters
  // --------------------------------------------------------------------------
  useEffect(() => {
    debouncedSearch(searchQuery, searchFilters);
  }, [searchQuery, searchFilters, debouncedSearch]);

  // --------------------------------------------------------------------------
  // 3) Suscripción a cambios en tiempo real (opcional pero recomendado)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!currentUserId) return;

    const subscription = supabase
      .channel(`user_tricks_${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Escuchar INSERT, UPDATE, DELETE
          schema: "public",
          table: "magic_tricks",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log("📡 Cambio detectado en magic_tricks:", payload);

          // Limpiar caché y refrescar
          paginatedContentService.clearUserCache(currentUserId);
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
          console.log("📡 Cambio detectado en trick_categories:", payload);

          // Verificar si el cambio afecta al usuario actual
          // Necesitaríamos hacer una consulta adicional para verificar el user_id del trick
          paginatedContentService.clearUserCache(currentUserId);
          refresh();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUserId]);

  // --------------------------------------------------------------------------
  // Función principal para cargar contenido paginado
  // --------------------------------------------------------------------------
  const loadContent = useCallback(
    async (pageToLoad: number, query?: string, filters?: SearchFilters) => {
      try {
        if (pageToLoad === 0) {
          setLoading(true);
          setError(null);
        } else {
          setLoadingMore(true);
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !isMounted.current) return;

        setCurrentUserId(user.id);

        // Ensure favorites category exists
        await ensureFavoritesCategory(user.id);

        const selectedCategoryId: string | undefined =
          filters?.categories?.[0] ?? undefined;

        const content = await paginatedContentService.getUserContentPaginated(
          user.id,
          pageToLoad,
          selectedCategoryId
        );
        if (!isMounted.current) return;

        const newSections = await processContentIntoSections(
          content,
          query,
          filters,
          user.id
        );

        if (pageToLoad === 0) {
          setAllCategories(content.categories);
          setSections(newSections);
        } else {
          setSections((prev) => mergeUniqueSections(prev, newSections));
        }

        setHasMore(content.hasMore);
        setPage(content.nextPage);

        // Prefetch siguiente página si hay más
        if (content.hasMore) {
          paginatedContentService.prefetchNextPage(
            user.id,
            pageToLoad,
            selectedCategoryId
          );
        }
      } catch (err) {
        console.error("Error cargando contenido:", err);
        setError("Error al cargar el contenido");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [processContentIntoSections]
  );

  // --------------------------------------------------------------------------
  // Ensure favorites category exists for user
  // --------------------------------------------------------------------------
  const ensureFavoritesCategory = async (userId: string) => {
    const { data: existingCategory } = await supabase
      .from("user_categories")
      .select("id")
      .eq("user_id", userId)
      .eq("name", "Favoritos")
      .single();

    if (!existingCategory) {
      await supabase.from("user_categories").insert({
        user_id: userId,
        name: "Favoritos",
        description: "Tus trucos favoritos",
      });
    }
  };

  // --------------------------------------------------------------------------
  // Cargar siguiente página si hay más
  // --------------------------------------------------------------------------
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadContent(page, searchQuery, searchFilters);
    }
  }, [page, loadingMore, hasMore, loadContent, searchQuery, searchFilters]);

  // --------------------------------------------------------------------------
  // Forzar refresco completo (limpia caché y recarga desde página 0)
  // --------------------------------------------------------------------------
  const refresh = useCallback(async () => {
    console.log("🔄 Iniciando refresh completo");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      // Limpiar TODO el caché del usuario
      paginatedContentService.clearUserCache(user.id);
    }

    // Resetear todos los estados
    setSections([]);
    setAllCategories([]);
    setPage(0);
    setHasMore(true);
    setError(null);
    setLoading(true);

    // Forzar recarga desde página 0
    await loadContent(0, searchQuery, searchFilters);
  }, [loadContent, searchQuery, searchFilters]);

  // --------------------------------------------------------------------------
  // Toggle favorite status and update sections
  // --------------------------------------------------------------------------
  const toggleFavorite = useCallback(
    async (itemId: string, contentType: string) => {
      if (!currentUserId || !favoritesCategoryId) return;

      const item = sections
        .flatMap((s) => s.items)
        .find((i) => i.id === itemId);
      if (!item) return;

      try {
        if (item.is_favorite) {
          // Remove from favorites
          await supabase
            .from("user_favorites")
            .delete()
            .eq("user_id", currentUserId)
            .eq("content_id", itemId)
            .eq("content_type", contentType);
        } else {
          // Add to favorites
          await supabase.from("user_favorites").insert({
            user_id: currentUserId,
            content_id: itemId,
            content_type: contentType,
          });
        }

        // Update sections locally
        setSections((prevSections) => {
          return prevSections.map((section) => {
            const updatedItems = section.items.map((i) => {
              if (i.id === itemId) {
                return { ...i, is_favorite: !i.is_favorite };
              }
              return i;
            });

            // Handle favorites category
            if (section.category.name === "Favoritos") {
              if (!item.is_favorite) {
                // Add to favorites
                const newItem = { ...item, is_favorite: true };
                return { ...section, items: [...updatedItems, newItem] };
              } else {
                // Remove from favorites
                return {
                  ...section,
                  items: updatedItems.filter((i) => i.id !== itemId),
                };
              }
            }

            return { ...section, items: updatedItems };
          });
        });
      } catch (error) {
        console.error("Error toggling favorite:", error);
      }
    },
    [currentUserId, favoritesCategoryId, sections]
  );

  // --------------------------------------------------------------------------
  // Devolvemos todo lo que necesita el componente que lo use
  // --------------------------------------------------------------------------
  return {
    sections,
    allCategories,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    toggleFavorite,
  };
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function matchesFilters(
  item: LibraryItem,
  query?: string,
  filters?: Pick<SearchFilters, "difficulties" | "tags">
): boolean {
  const queryLower = query?.toLowerCase().trim() ?? "";
  if (queryLower) {
    const matchesText =
      item.title.toLowerCase().includes(queryLower) ||
      item.description?.toLowerCase().includes(queryLower) ||
      false;
    if (!matchesText) return false;
  }

  if (filters?.difficulties?.length) {
    if (
      !item.difficulty ||
      !filters.difficulties.includes(String(item.difficulty))
    ) {
      return false;
    }
  }

  if (filters?.tags?.length) {
    if (!item.tags?.some((t) => filters.tags!.includes(t))) {
      return false;
    }
  }

  return true;
}

function parseJsonSafely(value: any, defaultValue: any = null): any {
  if (value == null) return defaultValue;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

function mergeUniqueSections(
  existing: CategorySection[],
  newSections: CategorySection[]
): CategorySection[] {
  const merged = [...existing];

  newSections.forEach((newSec) => {
    const idx = merged.findIndex((s) => s.category.id === newSec.category.id);
    if (idx >= 0) {
      const existingIds = new Set(merged[idx].items.map((i) => i.id));
      const uniqueNewItems = newSec.items.filter(
        (item) => !existingIds.has(item.id)
      );
      merged[idx].items.push(...uniqueNewItems);
    } else {
      merged.push(newSec);
    }
  });

  return merged;
}
