// context/LibraryDataContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { supabase } from "../lib/supabase";
import {
  localDataService,
  type LocalCategory,
  type LocalTrick,
} from "../services/LocalDataService";
import { supabaseDataService } from "../services/SupabaseDataService";
import type { SearchFilters } from "../components/home/CompactSearchBar";

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

      if (filters?.categories && filters.categories.length > 0) {
        filteredTricks = filteredTricks.filter((trick) =>
          trick.category_ids.some((catId) =>
            filters.categories!.includes(catId)
          )
        );
      }

      if (filters?.difficulties && filters.difficulties.length > 0) {
        filteredTricks = filteredTricks.filter((trick) =>
          trick.difficulty !== null
            ? filters.difficulties.includes(trick.difficulty)
            : false
        );
      }

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
    async (userId: string) => {
      try {
        console.log("[LibraryContext] Loading data for user:", userId);

        // Intentar cache local primero
        const cachedData = await localDataService.getUserData(userId);
        if (cachedData) {
          console.log("[LibraryContext] Cache hit!");
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

        console.log("[LibraryContext] Data loaded successfully");
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
  // FUNCIÓN: applyFilters
  // --------------------------------------------------------------------------
  const applyFilters = useCallback(
    (query: string, filters?: SearchFilters) => {
      setCurrentQuery(query);
      setCurrentFilters(filters);
      const newSections = buildSections(
        allCategories,
        rawTricks,
        query,
        filters
      );
      setSections(newSections);
    },
    [allCategories, rawTricks, buildSections]
  );

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
        console.log("[LibraryContext] Profile loaded:", computedName);

        // Cargar library data
        await loadData(user.id);
      } catch (err) {
        console.error("[LibraryContext] Mount error:", err);
        setInitializing(false);
      }
    })();
  }, [loadData]);

  // --------------------------------------------------------------------------
  // EFFECT: Realtime subscriptions
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!currentUserId) return;

    console.log("[LibraryContext] Setting up realtime subscriptions...");

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
          console.log("[LibraryContext] Realtime: magic_tricks changed");
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
          console.log("[LibraryContext] Realtime: user_categories changed");
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
          console.log("[LibraryContext] Realtime: user_favorites changed");
          refresh();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      console.log("[LibraryContext] Cleaning up realtime subscriptions");
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
