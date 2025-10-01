/* // hooks/usePaginatedContent.ts
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { paginatedContentService } from "../utils/paginatedContentService";
import { supabase } from "../lib/supabase";
import { orderService } from "../services/orderService";
import {
  cacheAuth,
  cacheSections,
  type CategorySection as SnapSection,
} from "../lib/localCache";

// ============================================================================
// función debounce para evitar múltiples llamadas rápidas
// ============================================================================
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
  (debounced as any).cancel = () => {
    if (timeout) clearTimeout(timeout);
  };
  return debounced as T & { cancel: () => void };
}

// ============================================================================
// Tipos de datos
// ============================================================================
export interface LibraryItem {
  id: string;
  title: string;
  type: "magic";
  difficulty?: number | null;
  status?: string | null;
  created_at?: string | null;
  duration?: number | null;
  category_id?: string | null;
  tags?: string[];
  description?: string | null;
  notes?: string | null;
  reset?: number | null;
  angles?: string[];
  is_shared?: boolean;
  owner_id?: string | null;
  is_favorite?: boolean;
  effect_video_url?: string | null;
  effect?: string | null;
  secret_video_url?: string | null;
  secret?: string | null;
  is_public?: boolean | null;
}

export interface CategorySection {
  category: { id: string; name: string; [key: string]: any };
  items: LibraryItem[];
}

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

type ProcessedContent = {
  categories: any[];
  tricks: any[];
  hasMore: boolean;
  nextPage: number;
};

// ============================================================================
// Hook principal
// ============================================================================
export function usePaginatedContent(
  searchQuery: string = "",
  searchFilters?: SearchFilters
) {
  // --------------------------------------------------------------------------
  // Estados principales
  // --------------------------------------------------------------------------
  const [sections, setSections] = useState<CategorySection[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // red
  const [booting, setBooting] = useState<boolean>(true); // hidratación MMKV
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [favoritesCategoryId, setFavoritesCategoryId] = useState<string | null>(
    null
  );

  const isMounted = useRef<boolean>(true);

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  const parseJsonSafely = <T = any>(value: any, defaultValue: T): T => {
    if (value == null) return defaultValue;
    if (typeof value !== "string") return value as T;
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  };

  const normalizeFilters = (filters?: SearchFilters) => ({
    categories: filters?.categories ?? [],
    tags: filters?.tags ?? [],
    tagsMode: filters?.tagsMode ?? "or",
    difficulties: filters?.difficulties ?? [],
    resetTimes: filters?.resetTimes ?? {},
    durations: filters?.durations ?? {},
    angles: filters?.angles ?? [],
    isPublic: typeof filters?.isPublic === "boolean" ? filters?.isPublic : null,
    sortOrder: filters?.sortOrder ?? "recent",
  });

  const makeSnapKeyParts = (
    userId: string,
    pageNum: number,
    filters?: SearchFilters
  ) => {
    const f = normalizeFilters(filters);
    const catsKey =
      f.categories && f.categories.length ? f.categories.join(",") : "all";
    const queryKey = searchQuery?.trim() ? searchQuery.trim() : "no-query";
    const filterKey = JSON.stringify({ ...f, tagsMode: f.tagsMode ?? "or" });
    return { userId, page: pageNum, catsKey, queryKey, filterKey };
  };

  // --------------------------------------------------------------------------
  // Convertir datos crudos a secciones organizadas por categoría
  // --------------------------------------------------------------------------
  const processContentIntoSections = useCallback(
    async (
      content: ProcessedContent,
      _query?: string,
      _filters?: SearchFilters,
      userId?: string
    ): Promise<CategorySection[]> => {
      const sectionsMap = new Map<string, CategorySection>();

      // Favoritos del usuario
      let userFavorites: Set<string> = new Set();
      if (userId) {
        const { data: favorites } = await supabase
          .from("user_favorites")
          .select("content_id")
          .eq("user_id", userId)
          .eq("content_type", "magic");
        if (favorites)
          userFavorites = new Set(
            favorites.map((f: { content_id: string }) => f.content_id)
          );
      }

      // Categorías (Favoritos primero)
      const sortedCategories = [...(content.categories || [])].sort(
        (a: any, b: any) => {
          if (a.name === "Favoritos") return -1;
          if (b.name === "Favoritos") return 1;
          return 0;
        }
      );

      sortedCategories.forEach((category: any) => {
        sectionsMap.set(category.id, { category, items: [] });
      });

      const favCat = sortedCategories.find((c: any) => c.name === "Favoritos");
      if (favCat) setFavoritesCategoryId(favCat.id);

      const newTricks: Array<{ trickId: string; categoryId: string }> = [];

      (content.tricks || []).forEach((trick: any) => {
        const isFavorite = userFavorites.has(trick.id);

        const item: LibraryItem = {
          id: trick.id,
          title: trick.title || "Sin título",
          type: "magic",
          difficulty: trick.difficulty ?? null,
          status: trick.status ?? null,
          created_at: trick.created_at ?? null,
          duration: trick.duration ?? null,
          tags:
            (trick.trick_tags?.map(
              (tt: { tag_id: string }) => tt.tag_id
            ) as string[]) || [],
          reset: trick.reset ?? null,
          notes: trick.notes ?? null,
          angles: parseJsonSafely<string[]>(trick.angles, []),
          owner_id: trick.user_id ?? null,
          is_favorite: isFavorite,
          category_id: trick.trick_categories?.[0]?.category_id ?? null,
          effect_video_url: trick.effect_video_url ?? null,
          effect: trick.effect ?? null,
          secret_video_url: trick.secret_video_url ?? null,
          secret: trick.secret ?? null,
          is_public: trick.is_public ?? null,
        };

        (trick.trick_categories || []).forEach(
          (tc: { category_id: string }) => {
            const section = sectionsMap.get(tc.category_id);
            if (section) {
              section.items.push(item);
              if (userId)
                newTricks.push({
                  trickId: trick.id,
                  categoryId: tc.category_id,
                });
            }
          }
        );

        if (isFavorite && favCat) {
          const favSection = sectionsMap.get(favCat.id);
          if (favSection) {
            favSection.items.push(item);
            if (userId)
              newTricks.push({ trickId: trick.id, categoryId: favCat.id });
          }
        }
      });

      // Inicializar órdenes si hace falta (no bloquea hidratación)
      if (userId && sortedCategories.length > 0) {
        try {
          const existingCategoryOrder = await orderService.getUserCategoryOrder(
            userId
          );
          const existingCategoryIds = new Set(
            existingCategoryOrder.map((o: any) => o.category_id)
          );

          for (const category of sortedCategories) {
            if (!existingCategoryIds.has(category.id)) {
              await orderService.initializeCategoryOrder(userId, category.id);
            }
          }

          const allTrickOrders = await orderService.getAllUserTrickOrders(
            userId
          );
          const existingTrickOrdersMap = new Map<string, Set<string>>();
          (allTrickOrders || []).forEach((order: any) => {
            const key = order.category_id as string;
            if (!existingTrickOrdersMap.has(key))
              existingTrickOrdersMap.set(key, new Set<string>());
            existingTrickOrdersMap.get(key)!.add(order.trick_id as string);
          });

          for (const { trickId, categoryId } of newTricks) {
            const categoryTricks = existingTrickOrdersMap.get(categoryId);
            if (!categoryTricks || !categoryTricks.has(trickId)) {
              await orderService.initializeTrickOrder(
                userId,
                categoryId,
                trickId
              );
            }
          }
        } catch {
          // silencioso
        }
      }

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
        loadContent(0, query, filters, { keepUI: true });
      }, 300),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // --------------------------------------------------------------------------
  // Carga principal (con opción keepUI para no flickear)
  // --------------------------------------------------------------------------
  const loadContent = useCallback(
    async (
      pageToLoad: number,
      query?: string,
      filters?: SearchFilters,
      opts?: { keepUI?: boolean }
    ) => {
      try {
        if (pageToLoad === 0) {
          if (!opts?.keepUI) {
            setLoading(true);
            setError(null);
          }
        } else {
          setLoadingMore(true);
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !isMounted.current) return;
        setCurrentUserId(user.id);
        cacheAuth.setLastUserId(user.id);

        const normalizedFilters = normalizeFilters(filters);
        const selectedCategoryIds = normalizedFilters.categories || [];

        const content = await paginatedContentService.getUserContentPaginated(
          user.id,
          pageToLoad,
          selectedCategoryIds,
          query,
          normalizedFilters
        );

        if (!isMounted.current) return;

        const newSections = await processContentIntoSections(
          content,
          undefined,
          undefined,
          user.id
        );

        if (pageToLoad === 0) {
          setAllCategories(content.categories || []);
          setSections(newSections);
        } else {
          setSections((prev) => mergeUniqueSections(prev, newSections));
        }

        setHasMore(content.hasMore);
        setPage(content.nextPage);

        // Guardar snapshot persistente (página 0) para arranque instantáneo
        const parts = makeSnapKeyParts(user.id, 0, normalizedFilters);
        const snapSections: SnapSection[] = (
          pageToLoad === 0
            ? newSections
            : mergeUniqueSections(sections, newSections)
        ).map((s) => ({ category: s.category, items: s.items }));
        cacheSections.set(parts, snapSections, content.categories || [], {
          hasMore: content.hasMore,
          nextPage: content.nextPage,
        });
      } catch (err) {
        console.error("Error cargando contenido:", err);
        setError("Error al cargar el contenido");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setBooting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [processContentIntoSections, sections]
  );

  // --------------------------------------------------------------------------
  // Forzar refresco completo (manteniendo UI)
  // --------------------------------------------------------------------------
  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) paginatedContentService.clearUserCache(user.id);
    setPage(0);
    setHasMore(true);
    setError(null);
    setLoading(true);
    await loadContent(0, searchQuery, searchFilters, { keepUI: true });
  }, [loadContent, searchQuery, searchFilters]);

  // --------------------------------------------------------------------------
  // Mount: hidratación inmediata desde MMKV + background refresh
  // --------------------------------------------------------------------------
  useEffect(() => {
    isMounted.current = true;

    (async () => {
      // 1) Hydration inmediato con lastUserId + snapshot persistente
      const lastUserId = cacheAuth.getLastUserId();
      if (lastUserId) {
        const parts = makeSnapKeyParts(lastUserId, 0, searchFilters);
        const snap = cacheSections.getSync(parts);

        if (snap && isMounted.current) {
          const snappedSections: CategorySection[] = (snap.sections || []).map(
            (s: SnapSection) => ({
              category: s.category,
              items: (s.items || []) as LibraryItem[],
            })
          );
          setSections(snappedSections);
          setAllCategories(snap.allCategories || []);
          setHasMore(snap.hasMore);
          setPage(snap.nextPage);
          setLoading(false); // ya hay datos para pintar
          setBooting(false);
        }
      }

      // 2) Fetch de red en background para asegurar frescura
      await loadContent(0, searchQuery, searchFilters, { keepUI: true });
    })();

    return () => {
      isMounted.current = false;
      (debouncedSearch as any)?.cancel?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------------------------------
  // Reaccionar a cambios de query/filtros
  // --------------------------------------------------------------------------
  useEffect(() => {
    debouncedSearch(searchQuery, searchFilters);
  }, [searchQuery, searchFilters, debouncedSearch]);

  // --------------------------------------------------------------------------
  // Suscripción realtime
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`user_tricks_${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "magic_tricks",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
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
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentUserId, refresh]);

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
      const { data: newCategory } = await supabase
        .from("user_categories")
        .insert({
          user_id: userId,
          name: "Favoritos",
          description: "Tus trucos favoritos",
        })
        .select()
        .single();

      if (newCategory)
        await orderService.initializeCategoryOrder(
          userId,
          newCategory.id as string
        );
    }
  };

  // --------------------------------------------------------------------------
  // Cargar siguiente página si hay más
  // --------------------------------------------------------------------------
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore)
      loadContent(page, searchQuery, searchFilters, { keepUI: true });
  }, [page, loadingMore, hasMore, loadContent, searchQuery, searchFilters]);

  // --------------------------------------------------------------------------
  // Toggle favorite
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
          await supabase
            .from("user_favorites")
            .delete()
            .eq("user_id", currentUserId)
            .eq("content_id", itemId)
            .eq("content_type", contentType);
          await supabase
            .from("user_trick_order")
            .delete()
            .eq("user_id", currentUserId)
            .eq("category_id", favoritesCategoryId)
            .eq("trick_id", itemId);
        } else {
          await supabase
            .from("user_favorites")
            .insert({
              user_id: currentUserId,
              content_id: itemId,
              content_type: contentType,
            });
          await orderService.initializeTrickOrder(
            currentUserId,
            favoritesCategoryId,
            itemId
          );
        }

        // Update UI local
        setSections((prev) =>
          prev.map((section) => {
            const updatedItems = section.items.map((i) =>
              i.id === itemId ? { ...i, is_favorite: !i.is_favorite } : i
            );
            if (section.category.name === "Favoritos") {
              if (!item.is_favorite) {
                const newItem = { ...item, is_favorite: true };
                return { ...section, items: [...updatedItems, newItem] };
              } else {
                return {
                  ...section,
                  items: updatedItems.filter((i) => i.id !== itemId),
                };
              }
            }
            return { ...section, items: updatedItems };
          })
        );

        // Re-snapshot tras cambio local
        const parts = makeSnapKeyParts(currentUserId, 0, searchFilters);
        const snap = sections.map((s) => ({
          category: s.category,
          items: s.items,
        }));
        cacheSections.set(parts, snap, allCategories, {
          hasMore,
          nextPage: page,
        });
      } catch (e) {
        console.error("Error toggling favorite:", e);
      }
    },
    [
      currentUserId,
      favoritesCategoryId,
      sections,
      allCategories,
      hasMore,
      page,
      searchFilters,
    ]
  );

  const handleNewTrickCreated = useCallback(
    async (trickId: string, categoryId: string) => {
      if (!currentUserId) return;
      try {
        await orderService.initializeTrickOrder(
          currentUserId,
          categoryId,
          trickId
        );
        await refresh();
      } catch (e) {
        console.error("Error initializing trick order:", e);
      }
    },
    [currentUserId, refresh]
  );

  return {
    sections,
    allCategories,
    loading,
    booting, // <- importante en UI
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    toggleFavorite,
    handleNewTrickCreated,
  };
}

// ============================================================================
// Utils
// ============================================================================
function mergeUniqueSections(
  existing: CategorySection[],
  next: CategorySection[]
): CategorySection[] {
  const merged = [...existing];
  next.forEach((ns) => {
    const idx = merged.findIndex((s) => s.category.id === ns.category.id);
    if (idx >= 0) {
      const existingIds = new Set(merged[idx].items.map((i) => i.id));
      const uniqueNew = ns.items.filter((it) => !existingIds.has(it.id));
      merged[idx].items.push(...uniqueNew);
    } else {
      merged.push(ns);
    }
  });
  return merged;
}
 */