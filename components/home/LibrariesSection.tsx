// components/home/LibrariesSection.tsx
"use client";

import {
  useState,
  useCallback,
  memo,
  useEffect,
  useMemo,
  useRef,
  useReducer,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Platform,
  Dimensions,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { AntDesign, Feather } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { supabase } from "../../lib/supabase";
import {
  type Category,
  createCategory,
  deleteCategory,
  updateCategory,
} from "../../utils/categoryService";
import { orderService } from "../../services/orderService";
import TrickViewScreen from "../TrickViewScreen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { SearchFilters } from "./CompactSearchBar";
import DeleteModal from "../ui/DeleteModal";
import CantDeleteModal from "../ui/CantDeleteModal";
import CategoryActionsModal from "../ui/CategoryActionsModal";
import CategoryModal from "../ui/CategoryModal";
import { useRouter } from "expo-router";
import { usePaginatedContent } from "../../hooks/usePaginatedContent";
import CollapsibleCategoryOptimized from "./CollapsibleCategoryOptimized";
import { fontNames } from "../../app/_layout";
import MagicLoader from "../ui/MagicLoader";
import { useTrickDeletion } from "../../context/TrickDeletionContext";
import { paginatedContentService } from "../../utils/paginatedContentService";
import { DraggableCategory } from "../DraggableCategory";
import { DragOverlay } from "../DragOverlay";
import { TrickDragOverlay } from "../TrickDragOverlay";
import { useSharedValue, withSpring } from "react-native-reanimated";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

// Calculate safe area for navigation bar
const NAVBAR_HEIGHT = 60;
const BOTTOM_SPACING = Platform.select({ ios: 20, default: 10 });

interface LibrariesSectionProps {
  searchQuery?: string;
  searchFilters?: SearchFilters;
}

const LibrariesSection = memo(function LibrariesSection({
  searchQuery = "",
  searchFilters,
}: LibrariesSectionProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { deletedTrickId } = useTrickDeletion();
  const [userId, setUserId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Modal states
  const [isAddCategoryModalVisible, setAddCategoryModalVisible] =
    useState(false);
  const [isEditCategoryModalVisible, setEditCategoryModalVisible] =
    useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedTrickData, setSelectedTrickData] = useState<any>(null);

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showCantDeleteModal, setShowCantDeleteModal] = useState(false);
  const [categoryItemCount, setCategoryItemCount] = useState(0);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedCategoryForActions, setSelectedCategoryForActions] =
    useState<Category | null>(null);

  // Total tricks count state
  const [totalTricksCount, setTotalTricksCount] = useState(0);

  // Order state
  const [categoryOrder, setCategoryOrder] = useState<any[]>([]);
  const [trickOrders, setTrickOrders] = useState<Map<string, any[]>>(new Map());

  // Drag and drop states for categories
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const flatListRef = useRef<FlashList<any>>(null);

  // Ref para mantener el draggedItem durante todo el proceso
  const draggedItemRef = useRef<any>(null);

  // Shared values para animaciones de drag
  const dragTranslateX = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);
  const dragScale = useSharedValue(1);

  // Estados para drag & drop de trucos
  const [draggedTrick, setDraggedTrick] = useState<any>(null);
  const isDraggingTrickRef = useRef(false);
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const [dropTargetCategoryId, setDropTargetCategoryId] = useState<
    string | null
  >(null);
  const draggedTrickRef = useRef<any>(null);

  // Shared values para animaciones de drag de trucos
  const trickDragTranslateX = useSharedValue(0);
  const trickDragTranslateY = useSharedValue(0);
  const trickDragScale = useSharedValue(1);

  // Estado de expansión
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // Check if search or filters are active
  const hasActiveSearchOrFilters = useMemo(() => {
    const hasSearch = searchQuery.trim() !== "";
    const hasFilters =
      searchFilters &&
      (searchFilters.categories.length > 0 ||
        searchFilters.tags.length > 0 ||
        searchFilters.difficulties.length > 0 ||
        searchFilters.resetTimes.min !== undefined ||
        searchFilters.resetTimes.max !== undefined ||
        searchFilters.durations.min !== undefined ||
        searchFilters.durations.max !== undefined ||
        searchFilters.angles.length > 0 ||
        (searchFilters.isPublic !== null &&
          searchFilters.isPublic !== undefined) ||
        (searchFilters.sortOrder && searchFilters.sortOrder !== "recent"));
    return hasSearch || hasFilters;
  }, [searchQuery, searchFilters]);

  // Use paginated content hook
  const {
    sections,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    allCategories,
  } = usePaginatedContent(searchQuery, searchFilters);

  // Get user ID
  useEffect(() => {
    const fetchUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUserId();
  }, []);

  // Load custom order when user ID is available
  useEffect(() => {
    if (userId && !hasActiveSearchOrFilters) {
      loadCustomOrder();
    }
  }, [userId, hasActiveSearchOrFilters]);

  // Load custom order from database
  const loadCustomOrder = async () => {
    if (!userId) return;

    const categoryOrderData = await orderService.getUserCategoryOrder(userId);
    const allTrickOrders = await orderService.getAllUserTrickOrders(userId);

    setCategoryOrder(categoryOrderData);

    // Group trick orders by category
    const ordersByCategory = new Map<string, any[]>();
    allTrickOrders.forEach((order) => {
      const categoryOrders = ordersByCategory.get(order.category_id) || [];
      categoryOrders.push(order);
      ordersByCategory.set(order.category_id, categoryOrders);
    });

    setTrickOrders(ordersByCategory);
  };

  // Apply custom order to sections
  const orderedSections = useMemo(() => {
    if (hasActiveSearchOrFilters || categoryOrder.length === 0) {
      return sections;
    }

    // Create a map of category positions
    const positionMap = new Map<string, number>();
    categoryOrder.forEach((order) => {
      positionMap.set(order.category_id, order.position);
    });

    // Sort sections based on custom order
    const sorted = [...sections].sort((a, b) => {
      // Favorites always first
      const aIsFavorites = a.category.name.toLowerCase().includes("favorit");
      const bIsFavorites = b.category.name.toLowerCase().includes("favorit");

      if (aIsFavorites && !bIsFavorites) return -1;
      if (!aIsFavorites && bIsFavorites) return 1;

      const aPos = positionMap.get(a.category.id) ?? Number.MAX_VALUE;
      const bPos = positionMap.get(b.category.id) ?? Number.MAX_VALUE;

      return aPos - bPos;
    });

    // Apply trick order within each category
    return sorted.map((section) => {
      const categoryTrickOrder = trickOrders.get(section.category.id);
      if (!categoryTrickOrder || categoryTrickOrder.length === 0) {
        return section;
      }

      // Create position map for tricks
      const trickPositionMap = new Map<string, number>();
      categoryTrickOrder.forEach((order) => {
        trickPositionMap.set(order.trick_id, order.position);
      });

      // Sort items based on custom order
      const sortedItems = [...(section.items || [])].sort((a, b) => {
        const aPos = trickPositionMap.get(a.id) ?? Number.MAX_VALUE;
        const bPos = trickPositionMap.get(b.id) ?? Number.MAX_VALUE;
        return aPos - bPos;
      });

      return {
        ...section,
        items: sortedItems,
      };
    });
  }, [sections, categoryOrder, trickOrders, hasActiveSearchOrFilters]);

  // Filter sections to hide empty categories when there's an active search
  const filteredSections = useMemo(() => {
    const hasActiveSearch =
      searchQuery.trim() !== "" || hasActiveSearchOrFilters;

    let result = orderedSections;

    if (hasActiveSearch) {
      result = orderedSections.filter((section) => {
        if (section.items && section.items.length > 0) {
          return true;
        }

        if (searchQuery.trim()) {
          const categoryNameLower = section.category.name.toLowerCase();
          const searchQueryLower = searchQuery.toLowerCase().trim();
          return categoryNameLower.includes(searchQueryLower);
        }

        return false;
      });
    }

    // Añadir estado de expansión
    return result.map((section) => ({
      ...section,
      isExpanded: expandedCategories.has(section.category.id),
    }));
  }, [
    orderedSections,
    searchQuery,
    hasActiveSearchOrFilters,
    expandedCategories,
  ]);

  // Handle expand/collapse
  const handleExpandChange = useCallback(
    (categoryId: string, isExpanded: boolean) => {
      setExpandedCategories((prev) => {
        const newSet = new Set(prev);
        if (isExpanded) {
          newSet.add(categoryId);
        } else {
          newSet.delete(categoryId);
        }
        return newSet;
      });
    },
    []
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (itemId: string, index: number) => {
      console.log("🟢 handleDragStart - INICIO", { itemId, index });

      const section = filteredSections.find((s) => s.category.id === itemId);
      if (!section) {
        console.log("🟢 No se encontró la sección");
        return;
      }

      if (section.category.name.toLowerCase().includes("favorit")) {
        console.log("🟢 Es categoría de favoritos - no se puede arrastrar");
        return;
      }

      const nonFavoriteSections = filteredSections.filter(
        (s) => !s.category.name.toLowerCase().includes("favorit")
      );

      const realIndex = nonFavoriteSections.findIndex(
        (s) => s.category.id === itemId
      );

      if (realIndex === -1) {
        console.log("🟢 No se encontró el índice real");
        return;
      }

      const itemHeight = 68;
      const headerHeight = 40;
      const originalY = headerHeight + realIndex * itemHeight;

      // Resetear valores animados
      dragTranslateX.value = 0;
      dragTranslateY.value = 0;
      dragScale.value = withSpring(1.1);

      const newDraggedItem = {
        id: section.category.id,
        name: section.category.name,
        originalIndex: realIndex,
        originalY: originalY,
        itemCount: section.items?.length || 0,
      };

      console.log("🟢 Configurando draggedItem:", newDraggedItem);

      // Guardar en ambos lugares para asegurar que no se pierda
      draggedItemRef.current = newDraggedItem;
      setDraggedItem(newDraggedItem);
      setIsDragging(true);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },
    [filteredSections, dragTranslateX, dragTranslateY, dragScale]
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (translationY: number) => {
      // Actualizar la posición del overlay
      dragTranslateY.value = translationY;

      // Calcular el índice basado en el desplazamiento
      const itemHeight = 68;
      const currentIndex = draggedItem?.originalIndex || 0;
      const indexOffset = Math.round(translationY / itemHeight);
      const newIndex = Math.max(0, currentIndex + indexOffset);

      const nonFavoriteSections = filteredSections.filter(
        (s) => !s.category.name.toLowerCase().includes("favorit")
      );

      if (newIndex >= 0 && newIndex < nonFavoriteSections.length) {
        setHoveredIndex(newIndex);

        // Haptic feedback solo cuando cambia el índice
        if (newIndex !== hoveredIndex) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    },
    [draggedItem, filteredSections, dragTranslateY, hoveredIndex]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    async (finalY: number) => {
      console.log("🔴 handleDragEnd - INICIO con finalY:", finalY);

      // Usar el ref como respaldo si el state se perdió
      const currentDraggedItem = draggedItem || draggedItemRef.current;

      if (!currentDraggedItem || !userId || isReordering) {
        console.log("🔴 Saliendo temprano");
        // Limpiar todo inmediatamente
        draggedItemRef.current = null;
        setDraggedItem(null);
        setIsDragging(false);
        setHoveredIndex(null);
        dragTranslateY.value = 0;
        dragScale.value = 1;
        return;
      }

      // IMPORTANTE: Limpiar estados visuales INMEDIATAMENTE
      draggedItemRef.current = null;
      setDraggedItem(null);
      setIsDragging(false);
      setHoveredIndex(null);
      dragTranslateY.value = 0;
      dragScale.value = 1;

      try {
        const itemHeight = 68;
        const indexOffset = Math.round(finalY / itemHeight);
        const oldIndex = currentDraggedItem.originalIndex;

        // Obtener las secciones no-favoritos para calcular el límite correcto
        const nonFavoriteSections = filteredSections.filter(
          (s) => !s.category.name.toLowerCase().includes("favorit")
        );

        const newIndex = Math.max(
          0,
          Math.min(oldIndex + indexOffset, nonFavoriteSections.length - 1)
        );

        console.log("🔴 Cálculo de índices:", {
          finalY,
          indexOffset,
          oldIndex,
          newIndex,
          totalNonFavorites: nonFavoriteSections.length,
        });

        if (oldIndex === newIndex) {
          console.log("🔴 No se movió - ya limpiamos estados");
          return;
        }

        // Prevenir múltiples reordenamientos
        if (isReordering) {
          console.log("🔴 Ya está reordenando");
          return;
        }

        setIsReordering(true);

        // Validar índices
        if (
          oldIndex < 0 ||
          oldIndex >= nonFavoriteSections.length ||
          newIndex < 0 ||
          newIndex >= nonFavoriteSections.length
        ) {
          console.error(
            `Índice fuera de rango: oldIndex=${oldIndex}, newIndex=${newIndex}, max=${
              nonFavoriteSections.length - 1
            }`
          );
          setIsReordering(false);
          return;
        }

        // Reordenar categorías localmente
        const visualOrder = nonFavoriteSections.map((s) => s.category.id);
        console.log("🔴 Orden antes:", visualOrder);

        const [movedItem] = visualOrder.splice(oldIndex, 1);
        visualOrder.splice(newIndex, 0, movedItem);

        console.log("🔴 Orden después:", visualOrder);

        // Crear actualizaciones
        const updates = visualOrder.map((categoryId, index) => ({
          user_id: userId,
          category_id: categoryId,
          position: index,
        }));

        // Actualizar estado local INMEDIATAMENTE
        setCategoryOrder(updates);

        // Guardar en BD en background (sin await)
        const saveToDatabase = async () => {
          try {
            // Actualizar en la base de datos
            for (const update of updates) {
              await orderService.updateCategoryOrder(
                userId,
                update.category_id,
                update.position
              );
            }

            // Forzar flush de actualizaciones
            await orderService.flushUpdates();

            // Recargar el orden personalizado
            await loadCustomOrder();

            console.log("🔴 Base de datos actualizada exitosamente");
          } catch (error) {
            console.error("🔴 Error actualizando base de datos:", error);
            // Opcionalmente: revertir cambios locales si falla
            // loadCustomOrder();
          } finally {
            setIsReordering(false);
          }
        };

        // Ejecutar guardado en background
        saveToDatabase();
      } catch (error) {
        console.error("🔴 Error en handleDragEnd:", error);
        setIsReordering(false);
      }

      console.log("🔴 handleDragEnd - FIN (UI actualizada)");
    },
    [
      draggedItem,
      userId,
      isReordering,
      filteredSections,
      loadCustomOrder,
      dragScale,
      dragTranslateY,
    ]
  );

  // Handle trick drag start
  const handleTrickDragStart = useCallback(
    (
      trickId: string,
      categoryId: string,
      index: number,
      startX: number,
      startY: number
    ) => {
      console.log("📍 LIBRARIES - handleTrickDragStart con posición inicial", {
        trickId,
        categoryId,
        index,
        startX,
        startY,
        screenHeight: Dimensions.get("window").height,
      });

      // Buscar el truco en las secciones
      let trickData = null;
      for (const section of filteredSections) {
        if (section.category.id === categoryId) {
          const trick = section.items?.find((item: any) => item.id === trickId);
          if (trick) {
            trickData = trick;
            break;
          }
        }
      }

      if (!trickData) {
        console.log("📍 LIBRARIES - No se encontró el truco");
        return;
      }

      // Resetear valores animados
      trickDragTranslateX.value = 0;
      trickDragTranslateY.value = 0;
      trickDragScale.value = withSpring(1.05);

      // NO aplicar offset aquí - el overlay se centrará automáticamente
      const newDraggedTrick = {
        id: trickId,
        title: trickData.title,
        categoryId: categoryId,
        originalIndex: index,
        data: trickData,
        startX: startX,
        startY: startY, // Sin offset
      };

      console.log(
        "📍 LIBRARIES - Configurando draggedTrick con posición:",
        newDraggedTrick
      );

      draggedTrickRef.current = newDraggedTrick;
      isDraggingTrickRef.current = true;

      setDraggedTrick(newDraggedTrick);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [filteredSections, trickDragTranslateX, trickDragTranslateY, trickDragScale]
  );

  // Handle trick drag move
  const handleTrickDragMove = useCallback(
    (translationX: number, translationY: number) => {
      console.log("📍 LIBRARIES - handleTrickDragMove llamado", {
        translationX,
        translationY,
        isDraggingTrick: isDraggingTrickRef.current,
        draggedTrick: draggedTrickRef.current?.id,
      });

      // Usar refs en lugar de state
      if (!draggedTrickRef.current || !isDraggingTrickRef.current) {
        console.log("📍 LIBRARIES - Saliendo temprano de handleTrickDragMove");
        return;
      }

      // Actualizar la posición del overlay
      trickDragTranslateX.value = translationX;
      trickDragTranslateY.value = translationY;

      // Calcular sobre qué categoría está el truco
      const itemHeight = 50;
      const categoryHeight = 68;
      const headerHeight = 40;

      // Estimar la posición Y actual basándose en el desplazamiento
      let accumulatedHeight = headerHeight;
      let targetCategory = null;

      for (const section of filteredSections) {
        const sectionTop = accumulatedHeight;
        const sectionHeight =
          categoryHeight +
          (section.isExpanded ? (section.items?.length || 0) * itemHeight : 0);

        // Si el centro del drag está dentro de esta sección
        if (
          translationY + 200 >= sectionTop - accumulatedHeight &&
          translationY + 200 < sectionTop + sectionHeight - accumulatedHeight
        ) {
          targetCategory = section.category.id;
          break;
        }

        accumulatedHeight += sectionHeight + 8; // 8px margin
      }

      // Actualizar el objetivo de drop si cambió
      if (targetCategory !== dropTargetCategoryId) {
        console.log("📍 LIBRARIES - Cambiando categoría objetivo", {
          anterior: dropTargetCategoryId,
          nueva: targetCategory,
        });
        setDropTargetCategoryId(targetCategory);
        if (targetCategory) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    },
    [
      filteredSections,
      trickDragTranslateX,
      trickDragTranslateY,
      dropTargetCategoryId,
    ]
  );

  // Handle trick drag end
  const handleTrickDragEnd = useCallback(
    async (finalX: number, finalY: number) => {
      console.log("🎯 handleTrickDragEnd", { finalX, finalY });

      const currentDraggedTrick = draggedTrickRef.current;

      if (!currentDraggedTrick || !userId) {
        console.log("🎯 No hay truco o usuario - limpiando");
        resetTrickDragState();
        return;
      }

      // Limpiar estados visuales inmediatamente
      resetTrickDragState();

      // Si no hay categoría objetivo o es la misma, no hacer nada
      if (
        !dropTargetCategoryId ||
        dropTargetCategoryId === currentDraggedTrick.categoryId
      ) {
        console.log("🎯 No hay cambio de categoría");
        return;
      }

      try {
        console.log(
          "🎯 Moviendo truco de",
          currentDraggedTrick.categoryId,
          "a",
          dropTargetCategoryId
        );

        // Actualizar la base de datos en background
        const moveTrick = async () => {
          try {
            // 1. Eliminar de la categoría actual
            await supabase
              .from("trick_categories")
              .delete()
              .eq("trick_id", currentDraggedTrick.id)
              .eq("category_id", currentDraggedTrick.categoryId);

            // 2. Añadir a la nueva categoría
            await supabase.from("trick_categories").insert({
              trick_id: currentDraggedTrick.id,
              category_id: dropTargetCategoryId,
            });

            // 3. Actualizar el orden en ambas categorías
            // TODO: Implementar lógica de orden

            console.log("🎯 Truco movido exitosamente");

            // Refrescar los datos
            refresh();
          } catch (error) {
            console.error("🎯 Error moviendo truco:", error);
          }
        };

        // Ejecutar en background
        moveTrick();
      } catch (error) {
        console.error("🎯 Error en handleTrickDragEnd:", error);
      }
    },
    [userId, dropTargetCategoryId, refresh]
  );

  // Función helper para resetear el estado del drag de trucos
  const resetTrickDragState = useCallback(() => {
    console.log("🎯 Reseteando estado del drag de trucos");

    draggedTrickRef.current = null;
    isDraggingTrickRef.current = false;

    setDraggedTrick(null);
    setDropTargetCategoryId(null);

    trickDragTranslateX.value = 0;
    trickDragTranslateY.value = 0;
    trickDragScale.value = 1;
  }, [trickDragTranslateX, trickDragTranslateY, trickDragScale]);

  // Calculate total tricks count whenever sections update
  useEffect(() => {
    const calculateTotalTricks = () => {
      const total = sections.reduce((acc, section) => {
        const categoryName = section.category.name.toLowerCase().trim();
        const isFavoritesCategory = [
          "favoritos",
          "favorites",
          "favourites",
          "favorito",
          "favorite",
          "favourite",
        ].includes(categoryName);

        if (isFavoritesCategory) {
          return acc;
        }

        return acc + (section.items?.length || 0);
      }, 0);
      setTotalTricksCount(total);
    };

    calculateTotalTricks();
  }, [sections]);

  // Update when a trick is deleted
  useEffect(() => {
    if (deletedTrickId) {
      const clearCacheAndRefresh = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          paginatedContentService.clearUserCache(user.id);
          refresh();
        }
      };

      clearCacheAndRefresh();
    }
  }, [deletedTrickId, refresh]);

  // Fetch item data
  const fetchItemData = async (item: any) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      if (item.type === "magic") {
        const { data, error } = await supabase
          .from("magic_tricks")
          .select(
            `
            *,
            trick_categories!inner(category_id),
            scripts(id, title, content)
          `
          )
          .eq("id", item.id)
          .single();

        if (error || !data) return null;

        let angles = data.angles;
        if (angles && typeof angles === "string") {
          try {
            angles = JSON.parse(angles);
          } catch (e) {
            angles = [];
          }
        }

        let categoryName = "Unknown";
        if (data.trick_categories && data.trick_categories.length > 0) {
          const categoryId = data.trick_categories[0].category_id;
          const { data: categoryData } = await supabase
            .from("user_categories")
            .select("name")
            .eq("id", categoryId)
            .single();

          if (categoryData) {
            categoryName = categoryData.name;
          }
        }

        const { data: photosData } = await supabase
          .from("trick_photos")
          .select("photo_url")
          .eq("trick_id", item.id);

        const photos = photosData?.map((p) => p.photo_url) || [];

        return {
          id: data.id,
          title: data.title,
          category: categoryName,
          effect: data.effect || "",
          secret: data.secret || "",
          effect_video_url: data.effect_video_url,
          secret_video_url: data.secret_video_url,
          photo_url: data.photo_url,
          photos: photos,
          script: data.scripts?.[0]?.content || "",
          angles: angles || [],
          duration: data.duration || 0,
          reset: data.reset || 0,
          difficulty: data.difficulty || 0,
          notes: data.notes || "",
          is_shared: item.is_shared || false,
          owner_info: item.is_shared ? item.owner_id : null,
        };
      }

      return null;
    } catch (error) {
      console.error("Error in fetchItemData:", error);
      return null;
    }
  };

  // Handle category actions
  const handleAddCategory = useCallback(
    async (name: string) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const newCategory = await createCategory(user.id, name);

        if (newCategory && userId) {
          await orderService.initializeCategoryOrder(userId, newCategory.id);
          refresh();
        }

        setAddCategoryModalVisible(false);
      } catch (error) {
        console.error("Error adding category:", error);
      }
    },
    [refresh, userId]
  );

  const handleEditCategory = useCallback(
    async (name: string) => {
      if (!editingCategory) return;

      try {
        const success = await updateCategory(editingCategory.id, name);

        if (success) {
          refresh();
        }

        setEditingCategory(null);
        setEditCategoryModalVisible(false);
      } catch (error) {
        console.error("Error updating category:", error);
      }
    },
    [editingCategory, refresh]
  );

  const handleDeleteCategory = useCallback(
    async (categoryId: string) => {
      const category = sections.find(
        (s) => s.category.id === categoryId
      )?.category;
      if (!category) return;

      const categorySection = sections.find(
        (section) => section.category.id === categoryId
      );
      const itemCount = categorySection?.items.length || 0;

      if (itemCount > 0) {
        setCategoryToDelete({ id: category.id, name: category.name });
        setCategoryItemCount(itemCount);
        setShowCantDeleteModal(true);
        return;
      }

      setCategoryToDelete({ id: category.id, name: category.name });
      setShowDeleteModal(true);
    },
    [sections]
  );

  const confirmDeleteCategory = useCallback(async () => {
    if (!categoryToDelete || !userId) return;

    try {
      const success = await deleteCategory(categoryToDelete.id);
      if (success) {
        await orderService.cleanupCategoryOrder(userId, categoryToDelete.id);
        refresh();
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    } finally {
      setShowDeleteModal(false);
      setCategoryToDelete(null);
    }
  }, [categoryToDelete, refresh, userId]);

  const openEditCategoryModal = useCallback((category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setEditCategoryModalVisible(true);
  }, []);

  const handleMoreOptions = useCallback((category: Category) => {
    setSelectedCategoryForActions(category);
    setShowActionsModal(true);
  }, []);

  const handleItemPress = useCallback(
    async (item: any) => {
      const itemData = await fetchItemData(item);
      if (itemData) {
        router.push({
          pathname: "/trick/[id]",
          params: {
            id: itemData.id,
            trick: JSON.stringify(itemData),
          },
        });
      }
    },
    [router, fetchItemData]
  );

  // Render functions
  const ListHeader = useCallback(
    () => (
      <StyledView className="flex-row justify-between items-center mb-2 px-4">
        <StyledView className="flex-row items-center">
          <Feather name="book" size={24} color="white" />
          <Text
            style={{
              fontFamily: fontNames.light,
              fontSize: 18,
              color: "white",
              marginLeft: 10,
              includeFontPadding: false,
            }}
          >
            {totalTricksCount} {t("magicItems", "Magic Items")}
          </Text>
        </StyledView>
        <StyledTouchableOpacity
          className="p-2"
          onPress={() => setAddCategoryModalVisible(true)}
        >
          <AntDesign name="plus" size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>
    ),
    [totalTricksCount, t]
  );

  const ListFooter = useCallback(() => {
    if (!loadingMore) return null;

    return (
      <StyledView className="py-4">
        <MagicLoader size="small" />
      </StyledView>
    );
  }, [loadingMore]);

  const ListEmpty = useCallback(() => {
    return (
      <StyledView className="bg-white/5 p-6 rounded-lg items-center mx-4">
        <Text
          style={{
            fontFamily: fontNames.light,
            fontSize: 18,
            color: "rgba(255, 255, 255, 0.5)",
            textAlign: "center",
            marginBottom: 8,
            includeFontPadding: false,
          }}
        >
          {searchQuery.trim() || searchFilters?.categories?.length
            ? t("noSearchResults", "No results found")
            : t("noCategories", "No categories found")}
        </Text>
        {!searchQuery.trim() && !searchFilters?.categories?.length && (
          <StyledTouchableOpacity
            className="bg-emerald-700 px-4 py-2 rounded-lg mt-2"
            onPress={() => setAddCategoryModalVisible(true)}
          >
            <Text
              style={{
                fontFamily: fontNames.light,
                fontSize: 16,
                color: "white",
                includeFontPadding: false,
              }}
            >
              {t("addCategory")}
            </Text>
          </StyledTouchableOpacity>
        )}
      </StyledView>
    );
  }, [searchQuery, searchFilters, t]);

  // Render category
  const renderCategory = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const isFavorites = item.category.name.toLowerCase().includes("favorit");
      const canDrag =
        !hasActiveSearchOrFilters && !isFavorites && !item.isExpanded;

      if (!canDrag) {
        return (
          <CollapsibleCategoryOptimized
            section={item}
            searchQuery={searchQuery}
            searchFilters={searchFilters}
            onItemPress={handleItemPress}
            onEditCategory={openEditCategoryModal}
            onDeleteCategory={handleDeleteCategory}
            onMoreOptions={handleMoreOptions}
            isDragEnabled={false}
            onExpandChange={(isExpanded) =>
              handleExpandChange(item.category.id, isExpanded)
            }
            onTrickDragStart={handleTrickDragStart}
            onTrickDragMove={handleTrickDragMove}
            onTrickDragEnd={handleTrickDragEnd}
            isDraggingTrick={isDraggingTrickRef.current}
            draggedTrickId={draggedTrick?.id}
            isDropTarget={dropTargetCategoryId === item.category.id}
          />
        );
      }

      const nonFavoriteIndex = filteredSections
        .filter((s) => !s.category.name.toLowerCase().includes("favorit"))
        .findIndex((s) => s.category.id === item.category.id);

      return (
        <DraggableCategory
          item={{
            id: item.category.id,
            name: item.category.name,
            itemCount: item.items?.length || 0,
            category: item.category,
          }}
          index={nonFavoriteIndex}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          isDragging={isDragging}
          draggedItemId={draggedItem?.id}
          hoveredIndex={hoveredIndex}
          onMoreOptions={() => handleMoreOptions(item.category)}
          onToggleExpand={() => handleExpandChange(item.category.id, true)}
        />
      );
    },
    [
      hasActiveSearchOrFilters,
      searchQuery,
      searchFilters,
      handleItemPress,
      openEditCategoryModal,
      handleDeleteCategory,
      handleMoreOptions,
      handleDragStart,
      handleDragMove,
      handleDragEnd,
      isDragging,
      draggedItem,
      hoveredIndex,
      filteredSections,
      handleExpandChange,
      handleTrickDragStart,
      handleTrickDragMove,
      handleTrickDragEnd,
      draggedTrick,
      dropTargetCategoryId,
    ]
  );

  const keyExtractor = useCallback((item: any) => item.category.id, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !loadingMore) {
      loadMore();
    }
  }, [hasMore, loadingMore, loadMore]);

  // Main content
  const mainContent = (
    <View style={{ flex: 1 }}>
      <FlashList
        ref={flatListRef}
        data={filteredSections}
        renderItem={renderCategory}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        estimatedItemSize={100}
        getItemType={() => "category"}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refresh}
            tintColor="transparent"
            title="Refresh... ↓"
            titleColor="rgba(255, 255, 255, 0.6)"
            colors={["transparent"]}
            progressBackgroundColor="transparent"
            progressViewOffset={-50}
          />
        }
        contentContainerStyle={{
          paddingBottom: NAVBAR_HEIGHT + BOTTOM_SPACING,
        }}
        drawDistance={200}
        removeClippedSubviews={true}
        estimatedListSize={{
          height: 600,
          width: 350,
        }}
        scrollEnabled={!isDragging && !isDraggingTrickRef.current}
      />
      <DragOverlay
        draggedItem={draggedItem}
        translateX={dragTranslateX}
        translateY={dragTranslateY}
        scale={dragScale}
      />
    </View>
  );

  // Main render
  if (loading && sections.length === 0 && !error) {
    return (
      <StyledView className="flex-1">
        <ListHeader />
        <StyledView className="flex-1 justify-center items-center">
          <MagicLoader size="large" />
        </StyledView>
      </StyledView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* ① TRICK OVERLAY A NIVEL RAÍZ - FUERA DE CUALQUIER CONTENEDOR */}
      <TrickDragOverlay
        draggedTrick={draggedTrick}
        translateX={trickDragTranslateX}
        translateY={trickDragTranslateY}
        scale={trickDragScale}
      />

      {/* ② CONTENEDOR PRINCIPAL CON TODO LO DEMÁS */}
      <StyledView className="flex-1">
        <ListHeader />

        {error ? (
          <StyledView className="flex-1 justify-center items-center p-4">
            <Text
              style={{
                fontFamily: fontNames.light,
                fontSize: 16,
                color: "#ef4444",
                textAlign: "center",
                marginBottom: 16,
                includeFontPadding: false,
              }}
            >
              {error}
            </Text>
            <StyledTouchableOpacity
              className="bg-emerald-700 px-4 py-2 rounded-lg"
              onPress={refresh}
            >
              <Text
                style={{
                  fontFamily: fontNames.light,
                  fontSize: 16,
                  color: "white",
                  includeFontPadding: false,
                }}
              >
                {t("retry", "Retry")}
              </Text>
            </StyledTouchableOpacity>
          </StyledView>
        ) : (
          mainContent
        )}

        {/* Modals */}
        <CategoryModal
          visible={isAddCategoryModalVisible || isEditCategoryModalVisible}
          onClose={() => {
            setAddCategoryModalVisible(false);
            setEditCategoryModalVisible(false);
            setEditingCategory(null);
          }}
          onConfirm={editingCategory ? handleEditCategory : handleAddCategory}
          initialName={editingCategory?.name || ""}
          mode={editingCategory ? "edit" : "create"}
          currentCategoryId={editingCategory?.id}
        />

        {selectedTrickData && (
          <Modal
            visible={!!selectedTrickData}
            transparent={false}
            animationType="fade"
            onRequestClose={() => setSelectedTrickData(null)}
            presentationStyle="fullScreen"
          >
            <SafeAreaProvider>
              <TrickViewScreen
                trick={selectedTrickData}
                onClose={() => setSelectedTrickData(null)}
              />
            </SafeAreaProvider>
          </Modal>
        )}

        <CategoryActionsModal
          visible={showActionsModal}
          onClose={() => {
            setShowActionsModal(false);
            setSelectedCategoryForActions(null);
          }}
          onEdit={() => {
            if (selectedCategoryForActions) {
              openEditCategoryModal(selectedCategoryForActions);
            }
            setShowActionsModal(false);
          }}
          onDelete={() => {
            if (selectedCategoryForActions) {
              handleDeleteCategory(selectedCategoryForActions.id);
            }
            setShowActionsModal(false);
          }}
          categoryName={selectedCategoryForActions?.name}
        />

        <DeleteModal
          visible={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setCategoryToDelete(null);
          }}
          onConfirm={confirmDeleteCategory}
          itemName={categoryToDelete?.name}
          itemType={t("category", "category")}
        />

        <CantDeleteModal
          visible={showCantDeleteModal}
          onClose={() => {
            setShowCantDeleteModal(false);
            setCategoryToDelete(null);
            setCategoryItemCount(0);
          }}
          categoryName={categoryToDelete?.name}
          itemCount={categoryItemCount}
        />
      </StyledView>
    </GestureHandlerRootView>
  );
});

export default LibrariesSection;
