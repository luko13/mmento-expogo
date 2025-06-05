// hooks/usePaginatedContent.ts
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { paginatedContentService } from "../utils/paginatedContentService";
import { EncryptedContentService } from "../services/encryptedContentService";
import { useEncryption } from "./useEncryption";
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
  type: "magic" | "gimmick" | "technique" | "script";
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
  special_materials?: string[];
  is_encrypted?: boolean;
  is_shared?: boolean;
  owner_id?: string;
  decryption_error?: boolean;
  isDecrypting?: boolean;
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
  // Hooks y servicios de cifrado
  // --------------------------------------------------------------------------
  const { decryptForSelf, keyPair } = useEncryption();
  const encryptedService = useMemo(() => new EncryptedContentService(), []);

  // --------------------------------------------------------------------------
  // Refs para controlar la cola de descifrado y el estado de montaje
  // --------------------------------------------------------------------------
  const processedItems = useRef<Set<string>>(new Set());
  const decryptionQueue = useRef<Array<{ item: LibraryItem; sectionId: string }>>([]);
  const isProcessingQueue = useRef<boolean>(false);
  const isMounted = useRef<boolean>(true);

  // --------------------------------------------------------------------------
  // Función que descifra un solo ítem (propia de la cola)
  // --------------------------------------------------------------------------
  const decryptItem = useCallback(
    async (
      item: LibraryItem,
      userId: string
    ): Promise<Partial<LibraryItem> | null> => {
      const contentType =
        item.type === "magic"
          ? "magic_tricks"
          : item.type === "technique"
          ? "techniques"
          : "gimmicks";

      try {
        if (item.is_shared) {
          const decrypted = await encryptedService.getSharedContent(
            item.id,
            contentType as any,
            userId,
            decryptForSelf
          );
          return decrypted
            ? { title: decrypted.title || decrypted.name, ...decrypted }
            : null;
        } else {
          const decrypted = await encryptedService.getOwnContent(
            item.id,
            contentType as any,
            decryptForSelf,
            () => keyPair!.privateKey
          );
          return decrypted
            ? { title: decrypted.title || decrypted.name, ...decrypted }
            : null;
        }
      } catch (err) {
        console.error(`Error descifrando ${item.type} ${item.id}:`, err);
        return null;
      }
    },
    [decryptForSelf, encryptedService, keyPair]
  );

  // --------------------------------------------------------------------------
  // Convertir datos crudos a secciones organizadas por categoría + marca
  // de si necesitan descifrado
  // --------------------------------------------------------------------------
  const processContentIntoSections = useCallback(
    (
      content: {
        categories: any[];
        tricks: any[];
        techniques: any[];
        gimmicks: any[];
        hasMore: boolean;
        nextPage: number;
      },
      query?: string,
      filters?: SearchFilters,
      hasKeys: boolean = false
    ): CategorySection[] => {
      const sectionsMap = new Map<string, CategorySection>();

      content.categories.forEach((category) => {
        sectionsMap.set(category.id, {
          category,
          items: [],
        });
      });

      // -------------------------- TRUCOS --------------------------
      content.tricks.forEach((trick) => {
        const needsDecryption =
          trick.is_encrypted && trick.title === "[ENCRYPTED]";

        const item: LibraryItem = {
          id: trick.id,
          title: needsDecryption ? "Descifrando..." : trick.title || "Sin título",
          type: "magic",
          difficulty: trick.difficulty,
          status: trick.status,
          created_at: trick.created_at,
          duration: trick.duration,
          tags: trick.trick_tags?.map((tt: any) => tt.tag_id) || [],
          reset: trick.reset,
          notes: trick.notes,
          is_encrypted: trick.is_encrypted,
          owner_id: trick.user_id,
          decryption_error: needsDecryption && !hasKeys,
          isDecrypting: needsDecryption && hasKeys,
        };

        if (!matchesFilters(item, query, filters)) return;

        trick.trick_categories?.forEach((tc: any) => {
          const section = sectionsMap.get(tc.category_id);
          if (section) {
            section.items.push(item);
          }
        });
      });

      // -------------------------- TÉCNICAS --------------------------
      content.techniques.forEach((technique) => {
        const needsDecryption =
          technique.is_encrypted && technique.name === "[ENCRYPTED]";

        const item: LibraryItem = {
          id: technique.id,
          title: needsDecryption
            ? "Descifrando..."
            : technique.name || "Sin título",
          type: "technique",
          difficulty: technique.difficulty,
          status: technique.status,
          created_at: technique.created_at,
          tags: technique.technique_tags?.map((tt: any) => tt.tag_id) || [],
          description: technique.description,
          notes: technique.notes,
          angles: parseJsonSafely(technique.angles, []),
          special_materials: technique.special_materials,
          is_encrypted: technique.is_encrypted,
          owner_id: technique.user_id,
          decryption_error: needsDecryption && !hasKeys,
          isDecrypting: needsDecryption && hasKeys,
        };

        if (!matchesFilters(item, query, filters)) return;

        technique.technique_categories?.forEach((tc: any) => {
          const section = sectionsMap.get(tc.category_id);
          if (section) {
            section.items.push(item);
          }
        });
      });

      // ------------------------- GIMMICKS -------------------------
      content.gimmicks.forEach((gimmick) => {
        const needsDecryption =
          gimmick.is_encrypted && gimmick.name === "[ENCRYPTED]";

        const item: LibraryItem = {
          id: gimmick.id,
          title: needsDecryption
            ? "Descifrando..."
            : gimmick.name || "Sin título",
          type: "gimmick",
          difficulty: gimmick.difficulty,
          status: gimmick.status,
          created_at: gimmick.created_at,
          tags: [],
          description: gimmick.description,
          notes: gimmick.notes,
          angles: parseJsonSafely(gimmick.angles, []),
          special_materials: gimmick.special_materials,
          reset: gimmick.reset_time,
          is_encrypted: gimmick.is_encrypted,
          owner_id: gimmick.user_id,
          decryption_error: needsDecryption && !hasKeys,
          isDecrypting: needsDecryption && hasKeys,
        };

        if (!matchesFilters(item, query, filters)) return;

        gimmick.gimmick_categories?.forEach((gc: any) => {
          const section = sectionsMap.get(gc.category_id);
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
        if (!keyPair) {
                    return;
        }
        setPage(0);
        setSections([]);
        processedItems.current.clear();
        decryptionQueue.current = [];
        loadContent(0, query, filters);
      }, 300),
    [keyPair]
  );

  // --------------------------------------------------------------------------
  // 1) Efecto principal: carga inicial de contenido cuando keyPair esté listo
  // --------------------------------------------------------------------------
  useEffect(() => {
    isMounted.current = true;

    if (keyPair && !searchQuery && !searchFilters) {
      loadContent(0);
    }

    return () => {
      isMounted.current = false;
      isProcessingQueue.current = false;
      debouncedSearch.cancel();
    };
  }, [keyPair, searchQuery, searchFilters, debouncedSearch]);

  // --------------------------------------------------------------------------
  // 2) Efecto para disparar búsqueda cuando cambien query o filters, solo si keyPair
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!keyPair) return;
    debouncedSearch(searchQuery, searchFilters);
  }, [searchQuery, searchFilters, keyPair, debouncedSearch]);

  // --------------------------------------------------------------------------
  // 3) Efecto para procesar la cola de descifrado cada vez que cambian:
  //    - keyPair
  //    - currentUserId
  //    - sections (para ver si hay nuevos ítems marcados como isDecrypting)
  // --------------------------------------------------------------------------
  useEffect(() => {
        if (
      keyPair &&
      currentUserId &&
      decryptionQueue.current.length > 0 &&
      !isProcessingQueue.current
    ) {
      processDecryptionQueue();
    }
  }, [keyPair, currentUserId, sections]);

  // --------------------------------------------------------------------------
  // Función que procesa la cola de descifrado (lotes de BATCH_SIZE)
  // --------------------------------------------------------------------------
  const processDecryptionQueue = useCallback(async () => {
    if (isProcessingQueue.current || decryptionQueue.current.length === 0) {
            return;
    }

    isProcessingQueue.current = true;
    const itemsToProcess = [...decryptionQueue.current];
    decryptionQueue.current = [];

    
    try {
      const BATCH_SIZE = 3;

      for (let i = 0; i < itemsToProcess.length; i += BATCH_SIZE) {
        if (!isMounted.current) {
                    break;
        }

        const batch = itemsToProcess.slice(i, i + BATCH_SIZE);

        await Promise.allSettled(
          batch.map(async ({ item, sectionId }) => {
            const itemKey = `${sectionId}-${item.id}`;

            if (processedItems.current.has(itemKey)) {
                            return;
            }

            try {
                            const decrypted = await decryptItem(item, currentUserId!);

              processedItems.current.add(itemKey);

              if (!isMounted.current) {
                                return;
              }

              if (decrypted) {
                                setSections((prevSections) =>
                  prevSections.map((section) => {
                    if (section.category.id !== sectionId) return section;
                    return {
                      ...section,
                      items: section.items.map((existing) => {
                        if (
                          existing.id === item.id &&
                          existing.type === item.type
                        ) {
                          const decryptedTitle =
                            decrypted.title ||
                            (decrypted as any).name ||
                            existing.title;

                          return {
                            ...existing,
                            title: decryptedTitle,
                            description: decrypted.description ?? existing.description,
                            notes: decrypted.notes ?? existing.notes,
                            isDecrypting: false,
                            decryption_error: false,
                          };
                        }
                        return existing;
                      }),
                    };
                  })
                );
              } else {
                console.warn(
                  `⚠️ decryptItem devolvió null para ${item.type} ${item.id}`
                );
                setSections((prevSections) =>
                  prevSections.map((section) => {
                    if (section.category.id !== sectionId) return section;
                    return {
                      ...section,
                      items: section.items.map((existing) => {
                        if (
                          existing.id === item.id &&
                          existing.type === item.type
                        ) {
                          return {
                            ...existing,
                            isDecrypting: false,
                            decryption_error: true,
                          };
                        }
                        return existing;
                      }),
                    };
                  })
                );
              }
            } catch (err) {
              console.error(`❌ Error descifrando ${item.type} ${item.id}:`, err);
              processedItems.current.add(itemKey);

              if (!isMounted.current) {
                                return;
              }
              setSections((prevSections) =>
                prevSections.map((section) => {
                  if (section.category.id !== sectionId) return section;
                  return {
                    ...section,
                    items: section.items.map((existing) => {
                      if (
                        existing.id === item.id &&
                        existing.type === item.type
                      ) {
                        return {
                          ...existing,
                          isDecrypting: false,
                          decryption_error: true,
                        };
                      }
                      return existing;
                    }),
                  };
                })
              );
            }
          })
        );

        if (i + BATCH_SIZE < itemsToProcess.length) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } finally {
      isProcessingQueue.current = false;
      
      if (decryptionQueue.current.length > 0) {
                setTimeout(() => processDecryptionQueue(), 100);
      }
    }
  }, [currentUserId, decryptItem]);

  // --------------------------------------------------------------------------
  // Función principal para cargar contenido paginado
  // --------------------------------------------------------------------------
  const loadContent = useCallback(
    async (
      pageToLoad: number,
      query?: string,
      filters?: SearchFilters
    ) => {
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

        const newSections = processContentIntoSections(
          content,
          query,
          filters,
          Boolean(keyPair)
        );

        
        if (pageToLoad === 0) {
          setAllCategories(content.categories);
          setSections(newSections);
        } else {
          setSections((prev) => mergeUniqueSections(prev, newSections));
        }

        setHasMore(content.hasMore);
        setPage(content.nextPage);

        let itemsNeedingDecryption = 0;
        newSections.forEach((section) => {
          section.items.forEach((item) => {
            if (item.isDecrypting) {
              itemsNeedingDecryption++;
              const itemKey = `${section.category.id}-${item.id}`;
              if (!processedItems.current.has(itemKey)) {
                decryptionQueue.current.push({
                  item,
                  sectionId: section.category.id,
                });
              }
            }
          });
        });

                
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
    [keyPair, processContentIntoSections]
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
    processedItems.current.clear();
    decryptionQueue.current = [];
    isProcessingQueue.current = false;

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
      const existingIds = new Set(
        merged[idx].items.map((i) => `${i.type}-${i.id}`)
      );
      const uniqueNewItems = newSec.items.filter(
        (item) => !existingIds.has(`${item.type}-${item.id}`)
      );
      merged[idx].items.push(...uniqueNewItems);
    } else {
      merged.push(newSec);
    }
  });

  return merged;
}
