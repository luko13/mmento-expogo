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

  // --------------------------------------------------------------------------
  // Refs para controlar el estado de montaje
  // --------------------------------------------------------------------------
  const isMounted = useRef<boolean>(true);

  // --------------------------------------------------------------------------
  // Convertir datos crudos a secciones organizadas por categoría
  // --------------------------------------------------------------------------
  const processContentIntoSections = useCallback(
    (
      content: {
        categories: any[];
        tricks: any[];
        hasMore: boolean;
        nextPage: number;
      },
      query?: string,
      filters?: SearchFilters
    ): CategorySection[] => {
      const sectionsMap = new Map<string, CategorySection>();

      content.categories.forEach((category) => {
        sectionsMap.set(category.id, {
          category,
          items: [],
        });
      });

      // Solo procesar trucos
      content.tricks.forEach((trick) => {
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
        };

        if (!matchesFilters(item, query, filters)) return;

        trick.trick_categories?.forEach((tc: any) => {
          const section = sectionsMap.get(tc.category_id);
          if (section) {
            section.items.push(item);
          }
        });
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
  // Función principal para cargar contenido paginado
  // --------------------------------------------------------------------------
  const loadContent = useCallback(
    async (pageToLoad: number, query?: string, filters?: SearchFilters) => {
      try {
        if (pageToLoad === 0) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !isMounted.current) return;

        setCurrentUserId(user.id);

        const selectedCategoryId: string | undefined =
          filters?.categories?.[0] ?? undefined;

        const content = await paginatedContentService.getUserContentPaginated(
          user.id,
          pageToLoad,
          selectedCategoryId
        );
        if (!isMounted.current) return;

        const newSections = processContentIntoSections(content, query, filters);

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      paginatedContentService.clearUserCache(user.id);
    }

    setSections([]);
    setPage(0);
    loadContent(0, searchQuery, searchFilters);
  }, [loadContent, searchQuery, searchFilters]);

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
