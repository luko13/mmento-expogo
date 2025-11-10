// context/LibraryDataContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { supabase } from "../lib/supabase";
import {
  localDataService,
  type LocalCategory,
  type LocalTrick,
} from "../services/LocalDataService";
import { supabaseDataService } from "../services/SupabaseDataService";
import { hybridSearchService } from "../services/HybridSearchService";
import type { SearchFilters } from "../components/home/CompactSearchBar";
import { useTrickDeletion } from "./TrickDeletionContext";

// ============================================================================
// TIPOS
// ============================================================================

export interface CategorySection {
  category: LocalCategory;
  items: LocalTrick[];
  isExpanded?: boolean;
}

interface LibraryDataContextType {
  // User data
  userName: string;
  avatarUrl: string | null;
  greeting: string;

  // Library data
  sections: CategorySection[];
  allCategories: LocalCategory[];
  loading: boolean;
  initializing: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  toggleFavorite: (trickId: string) => Promise<void>;
  createCategory: (
    name: string,
    description?: string
  ) => Promise<LocalCategory | null>;
  updateCategory: (
    categoryId: string,
    name: string,
    description?: string
  ) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  applyFilters: (query: string, filters?: SearchFilters) => void;
}

const LibraryDataContext = createContext<LibraryDataContextType | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function LibraryDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // User state
  const [userName, setUserName] = useState("...");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Hello");

  // Library state
  const [sections, setSections] = useState<CategorySection[]>([]);
  const [allCategories, setAllCategories] = useState<LocalCategory[]>([]);
  const [rawTricks, setRawTricks] = useState<LocalTrick[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Current filters
  const [currentQuery, setCurrentQuery] = useState("");
  const [currentFilters, setCurrentFilters] = useState<
    SearchFilters | undefined
  >();

  // Refs
  const hasLoadedRef = useRef(false);
  const channelRef = useRef<any>(null);

  // Hook de eliminación de trucos
  const { deletedTrickId } = useTrickDeletion();

  // --------------------------------------------------------------------------
  // FUNCIÓN: buildSections (OPTIMIZADA)
  // --------------------------------------------------------------------------
  const buildSections = useCallback(
    (
      categories: LocalCategory[],
      tricks: LocalTrick[],
      query: string,
      filters?: SearchFilters
    ): CategorySection[] => {
      const normalizedQuery = query.toLowerCase().trim();

      // Combinar TODOS los filtros en un solo loop para mejor rendimiento
      const filteredTricks = tricks.filter((trick) => {
        // 1. Filtro de búsqueda de texto
        if (normalizedQuery) {
          const title = trick.title?.toLowerCase() || "";
          const effect = trick.effect?.toLowerCase() || "";
          const secret = trick.secret?.toLowerCase() || "";
          const matchesText =
            title.includes(normalizedQuery) ||
            effect.includes(normalizedQuery) ||
            secret.includes(normalizedQuery);

          if (!matchesText) return false;
        }

        // 2. Filtro de categorías
        if (filters?.categories && filters.categories.length > 0) {
          const matchesCategory = trick.category_ids.some((catId) =>
            filters.categories!.includes(catId)
          );
          if (!matchesCategory) return false;
        }

        // 3. Filtro de dificultad
        if (filters?.difficulties && filters.difficulties.length > 0) {
          if (trick.difficulty === null) return false;
          if (!filters.difficulties.includes(trick.difficulty)) return false;
        }

        // 4. Filtro de duración (min - max)
        if (filters?.durations) {
          const { min, max } = filters.durations;
          if (min !== undefined || max !== undefined) {
            if (trick.duration === null) return false;
            if (min !== undefined && trick.duration < min) return false;
            if (max !== undefined && trick.duration > max) return false;
          }
        }

        // 5. Filtro de reset time (min - max)
        if (filters?.resetTimes) {
          const { min, max } = filters.resetTimes;
          if (min !== undefined || max !== undefined) {
            if (trick.reset === null || trick.reset === undefined) return false;
            if (min !== undefined && trick.reset < min) return false;
            if (max !== undefined && trick.reset > max) return false;
          }
        }

        // 6. Filtro de ángulos
        if (filters?.angles && filters.angles.length > 0) {
          // Asumiendo que trick.angles es un array de strings o JSONB
          const trickAngles = Array.isArray(trick.angles)
            ? trick.angles
            : (trick.angles ? JSON.parse(trick.angles as any) : []);

          const matchesAngle = filters.angles.some(angle =>
            trickAngles.includes(angle) || trickAngles.includes(Number(angle))
          );

          if (!matchesAngle) return false;
        }

        // 7. Filtro de tags (con modo AND/OR)
        if (filters?.tags && filters.tags.length > 0) {
          const trickTags = trick.tag_ids || [];

          if (filters.tagsMode === "and") {
            // Modo AND: el truco debe tener TODOS los tags seleccionados
            const hasAllTags = filters.tags.every(tagId =>
              trickTags.includes(tagId)
            );
            if (!hasAllTags) return false;
          } else {
            // Modo OR (default): el truco debe tener AL MENOS UN tag
            const hasAnyTag = filters.tags.some(tagId =>
              trickTags.includes(tagId)
            );
            if (!hasAnyTag) return false;
          }
        }

        // Si pasó todos los filtros, incluir el truco
        return true;
      });

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
        // Excluir categorías que se llamen "Favoritos" para evitar duplicados con la virtual
        const isFavoritesCategory = cat.name.toLowerCase().trim() === "favoritos" ||
                                     cat.name.toLowerCase().trim() === "favorites" ||
                                     cat.name.toLowerCase().trim() === "favourites";

        if (isFavoritesCategory) {
          return; // Skip esta categoría
        }

        // Si hay filtro de categorías activo, solo mostrar las categorías seleccionadas
        const hasCategoyFilter = filters?.categories && filters.categories.length > 0;
        if (hasCategoyFilter && !filters!.categories!.includes(cat.id)) {
          return; // Skip categorías no seleccionadas
        }

        const tricksInCategory = filteredTricks.filter((trick) =>
          trick.category_ids.includes(cat.id)
        );

        // Mostrar TODAS las categorías, incluso las vacías
        categoryMap.set(cat.id, {
          category: cat,
          items: tricksInCategory,
        });
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
    async (userId: string) => {
      try {
        // Intentar cache local primero
        const cachedData = await localDataService.getUserData(userId);
        if (cachedData) {
          setRawTricks(cachedData.tricks);
          setAllCategories(cachedData.categories);
          const newSections = buildSections(
            cachedData.categories,
            cachedData.tricks,
            currentQuery,
            currentFilters
          );
          setSections(newSections);
          setInitializing(false);
        }

        // Fetch desde red
        setLoading(true);
        const { categories, tricks } =
          await supabaseDataService.fetchAllUserData(userId);

        localDataService.saveUserData({
          userId,
          categories,
          tricks,
          lastSync: Date.now(),
          version: 2,
        });

        setRawTricks(tricks);
        setAllCategories(categories);
        const newSections = buildSections(
          categories,
          tricks,
          currentQuery,
          currentFilters
        );
        setSections(newSections);
        setLoading(false);
        setInitializing(false);
      } catch (err: any) {
        console.error("[LibraryContext] Error loading data:", err);
        setError(err.message || "Error loading data");
        setLoading(false);
        setInitializing(false);
      }
    },
    [buildSections, currentQuery, currentFilters]
  );

  // --------------------------------------------------------------------------
  // FUNCIÓN: refresh
  // --------------------------------------------------------------------------
  const refresh = useCallback(async () => {
    if (!currentUserId) return;
    await loadData(currentUserId);
  }, [currentUserId, loadData]);

  // --------------------------------------------------------------------------
  // FUNCIÓN: toggleFavorite
  // --------------------------------------------------------------------------
  const toggleFavorite = useCallback(
    async (trickId: string) => {
      if (!currentUserId) return;

      const trick = rawTricks.find((t) => t.id === trickId);
      if (!trick) return;

      localDataService.toggleFavorite(currentUserId, trickId);

      const updatedData = await localDataService.getUserData(currentUserId);
      if (updatedData) {
        setRawTricks(updatedData.tricks);
        const newSections = buildSections(
          updatedData.categories,
          updatedData.tricks,
          currentQuery,
          currentFilters
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
        console.error("[LibraryContext] Error toggling favorite:", err);
        localDataService.toggleFavorite(currentUserId, trickId);
        refresh();
      }
    },
    [
      currentUserId,
      rawTricks,
      buildSections,
      currentQuery,
      currentFilters,
      refresh,
    ]
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
        console.error("[LibraryContext] Error creating category:", err);
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
        console.error("[LibraryContext] Error updating category:", err);
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
        console.error("[LibraryContext] Error deleting category:", err);
        return false;
      }
    },
    [currentUserId, refresh]
  );

  // --------------------------------------------------------------------------
  // FUNCIÓN: applyFilters (con memoización)
  // --------------------------------------------------------------------------
  const applyFilters = useCallback(
    (query: string, filters?: SearchFilters) => {
      setCurrentQuery(query);
      setCurrentFilters(filters);
    },
    []
  );

  // Memoizar sections para evitar recálculos innecesarios
  // Solo se recalcula cuando cambian: allCategories, rawTricks, currentQuery o currentFilters
  const memoizedSections = useMemo(() => {
    const shouldUseServer = hybridSearchService.shouldUseServerSearch(rawTricks.length);

    // Si debe usar servidor Y hay un query, el useEffect de abajo se encargará
    if (shouldUseServer && currentQuery.trim()) {
      // Retornar array vacío para indicar que está cargando del servidor
      return [];
    }

    // Búsqueda en cliente (normal)
    return buildSections(
      allCategories,
      rawTricks,
      currentQuery,
      currentFilters
    );
  }, [allCategories, rawTricks, currentQuery, currentFilters, buildSections]);

  // Actualizar sections desde memoizedSections (solo si no está usando servidor)
  useEffect(() => {
    const shouldUseServer = hybridSearchService.shouldUseServerSearch(rawTricks.length);

    // Solo actualizar si NO está usando búsqueda en servidor
    if (!shouldUseServer || !currentQuery.trim()) {
      setSections(memoizedSections);
    }
  }, [memoizedSections, rawTricks.length, currentQuery]);

  // Búsqueda asíncrona en servidor cuando hay muchos trucos
  useEffect(() => {
    if (!currentUserId) return;

    const shouldUseServer = hybridSearchService.shouldUseServerSearch(rawTricks.length);
    if (!shouldUseServer || !currentQuery.trim()) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const { tricks } = await hybridSearchService.hybridSearch(
          currentUserId,
          rawTricks,
          currentQuery,
          currentFilters
        );

        if (!cancelled) {
          const newSections = buildSections(
            allCategories,
            tricks,
            '',  // Query ya aplicado en servidor
            currentFilters
          );
          setSections(newSections);
        }
      } catch (error) {
        console.error('[LibraryContext] Hybrid search failed:', error);
        // Fallback a búsqueda en cliente
        if (!cancelled) {
          const newSections = buildSections(
            allCategories,
            rawTricks,
            currentQuery,
            currentFilters
          );
          setSections(newSections);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, rawTricks.length, currentQuery, currentFilters, allCategories, buildSections]);

  // --------------------------------------------------------------------------
  // EFFECT: Carga inicial (UNA SOLA VEZ)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setInitializing(false);
          return;
        }

        setCurrentUserId(user.id);

        // Cargar perfil
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, email, avatar_url")
          .eq("id", user.id)
          .single();

        const computedName =
          profile?.username || profile?.email?.split("@")[0] || "Usuario";
        setUserName(computedName);
        setAvatarUrl(profile?.avatar_url || null);

        // Cargar library data
        await loadData(user.id);
      } catch (err) {
        console.error("[LibraryContext] Mount error:", err);
        setInitializing(false);
      }
    })();
  }, [loadData]);

  // --------------------------------------------------------------------------
  // EFFECT: Responder a eliminaciones de trucos
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (deletedTrickId && currentUserId) {
      // Actualizar inmediatamente desde el caché local
      const cachedData = localDataService.getUserData(currentUserId);
      cachedData.then((data) => {
        if (data) {
          setRawTricks(data.tricks);
          const newSections = buildSections(
            data.categories,
            data.tricks,
            currentQuery,
            currentFilters
          );
          setSections(newSections);
        }
      });
    }
  }, [deletedTrickId, currentUserId, buildSections, currentQuery, currentFilters]);

  // --------------------------------------------------------------------------
  // EFFECT: Realtime subscriptions
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!currentUserId) return;

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
        () => {
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
        () => {
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
        () => {
          refresh();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentUserId, refresh]);

  return (
    <LibraryDataContext.Provider
      value={{
        userName,
        avatarUrl,
        greeting,
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
        applyFilters,
      }}
    >
      {children}
    </LibraryDataContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useLibraryData() {
  const context = useContext(LibraryDataContext);
  if (!context) {
    throw new Error("useLibraryData must be used within LibraryDataProvider");
  }
  return context;
}
