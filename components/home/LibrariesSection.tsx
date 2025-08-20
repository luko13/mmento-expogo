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
  findNodeHandle,
  NativeSyntheticEvent,
  NativeScrollEvent,
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

const NAVBAR_HEIGHT = 60;
const BOTTOM_SPACING = Platform.select({ ios: 20, default: 10 });

// Overlay absoluto para la línea de drop (por encima de la lista)
const DropLineOverlay = ({
  visible,
  y,
}: {
  visible: boolean;
  y: number | null;
}) => {
  if (!visible || y == null || Number.isNaN(y)) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 24,
        right: 24,
        top: y,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#10b981",
        zIndex: 9999,
      }}
    />
  );
};

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

  // Modales
  const [isAddCategoryModalVisible, setAddCategoryModalVisible] =
    useState(false);
  const [isEditCategoryModalVisible, setEditCategoryModalVisible] =
    useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedTrickData, setSelectedTrickData] = useState<any>(null);

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

  // Totales
  const [totalTricksCount, setTotalTricksCount] = useState(0);

  // Orden BD
  const [categoryOrder, setCategoryOrder] = useState<any[]>([]);
  const [trickOrders, setTrickOrders] = useState<Map<string, any[]>>(new Map());

  // Drag categorías
  const [draggedItem, setDraggedItem] = useState<{
    id: string;
    name: string;
    itemCount: number;
    originalIndex: number;
    startX?: number;
    startY?: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const draggedItemRef = useRef<any>(null);

  const flatListRef = useRef<FlashList<any> | null>(null);

  const dragTranslateX = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);
  const dragScale = useSharedValue(1);

  // Drag trucos (igual que tenías)
  const [draggedTrick, setDraggedTrick] = useState<any>(null);
  const isDraggingTrickRef = useRef(false);
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const [dropTargetCategoryId, setDropTargetCategoryId] = useState<
    string | null
  >(null);
  const draggedTrickRef = useRef<any>(null);

  const trickDragTranslateX = useSharedValue(0);
  const trickDragTranslateY = useSharedValue(0);
  const trickDragScale = useSharedValue(1);

  // Estado expansión
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // Overlay container y scroll
  const overlayContainerRef = useRef<View | null>(null);
  const [containerLeft, setContainerLeft] = useState(0);
  const [containerTop, setContainerTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // Layouts de filas (categorías no-favoritas)
  const rowLayoutsRef = useRef<Map<string, { y: number; height: number }>>(
    new Map()
  );
  const registerRowLayout = useCallback(
    (categoryId: string, y: number, height: number) => {
      const m = rowLayoutsRef.current;
      const prev = m.get(categoryId);
      if (!prev || prev.y !== y || prev.height !== height) {
        m.set(categoryId, { y, height });
      }
    },
    []
  );
  const clearRowLayouts = useCallback(() => {
    rowLayoutsRef.current.clear();
  }, []);

  const measureOverlayContainer = useCallback(() => {
    const node = findNodeHandle(overlayContainerRef.current);
    if (!node || !overlayContainerRef.current) return;
    overlayContainerRef.current.measureInWindow((x, y, w) => {
      setContainerLeft(x || 0);
      setContainerTop(y || 0);
      setContainerWidth(w || 0);
    });
  }, []);

  useEffect(() => {
    // medir al montar (RAF envía timestamp; lo envolvemos)
    requestAnimationFrame(() => measureOverlayContainer());
  }, [measureOverlayContainer]);

  // Hooks de datos
  const { sections, loading, loadingMore, hasMore, error, loadMore, refresh } =
    usePaginatedContent(searchQuery, searchFilters);

  // Usuario
  useEffect(() => {
    const fetchUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    fetchUserId();
  }, []);

  const hasActiveSearchOrFilters = useMemo(() => {
    const hasSearch = searchQuery.trim() !== "";
    const hasFilters =
      searchFilters &&
      (searchFilters.categories.length > 0 ||
        searchFilters.tags.length > 0 ||
        searchFilters.difficulties.length > 0 ||
        (searchFilters as any).resetTimes?.min !== undefined ||
        (searchFilters as any).resetTimes?.max !== undefined ||
        (searchFilters as any).durations?.min !== undefined ||
        (searchFilters as any).durations?.max !== undefined ||
        (searchFilters as any).angles?.length > 0 ||
        ((searchFilters as any).isPublic !== null &&
          (searchFilters as any).isPublic !== undefined) ||
        ((searchFilters as any).sortOrder &&
          (searchFilters as any).sortOrder !== "recent"));
    return hasSearch || hasFilters;
  }, [searchQuery, searchFilters]);

  useEffect(() => {
    if (userId && !hasActiveSearchOrFilters) {
      loadCustomOrder();
    }
  }, [userId, hasActiveSearchOrFilters]);

  const loadCustomOrder = async () => {
    if (!userId) return;
    const categoryOrderData = await orderService.getUserCategoryOrder(userId);
    const allTrickOrders = await orderService.getAllUserTrickOrders(userId);
    setCategoryOrder(categoryOrderData);

    const ordersByCategory = new Map<string, any[]>();
    allTrickOrders.forEach((order) => {
      const categoryOrders = ordersByCategory.get(order.category_id) || [];
      categoryOrders.push(order);
      ordersByCategory.set(order.category_id, categoryOrders);
    });
    setTrickOrders(ordersByCategory);
  };

  const orderedSections = useMemo(() => {
    if (hasActiveSearchOrFilters || categoryOrder.length === 0) {
      return sections;
    }

    const positionMap = new Map<string, number>();
    categoryOrder.forEach((order) => {
      positionMap.set(order.category_id, order.position);
    });

    const sorted = [...sections].sort((a, b) => {
      const aIsFavorites = a.category.name.toLowerCase().includes("favorit");
      const bIsFavorites = b.category.name.toLowerCase().includes("favorit");
      if (aIsFavorites && !bIsFavorites) return -1;
      if (!aIsFavorites && bIsFavorites) return 1;
      const aPos = positionMap.get(a.category.id) ?? Number.MAX_VALUE;
      const bPos = positionMap.get(b.category.id) ?? Number.MAX_VALUE;
      return aPos - bPos;
    });

    return sorted.map((section) => {
      const categoryTrickOrder = trickOrders.get(section.category.id);
      if (!categoryTrickOrder?.length) return section;

      const trickPositionMap = new Map<string, number>();
      categoryTrickOrder.forEach((order) => {
        trickPositionMap.set(order.trick_id, order.position);
      });

      const sortedItems = [...(section.items || [])].sort((a, b) => {
        const aPos = trickPositionMap.get(a.id) ?? Number.MAX_VALUE;
        const bPos = trickPositionMap.get(b.id) ?? Number.MAX_VALUE;
        return aPos - bPos;
      });

      return { ...section, items: sortedItems };
    });
  }, [sections, categoryOrder, trickOrders, hasActiveSearchOrFilters]);

  const filteredSections = useMemo(() => {
    const hasActiveSearch =
      searchQuery.trim() !== "" || hasActiveSearchOrFilters;

    let result = orderedSections;

    if (hasActiveSearch) {
      result = orderedSections.filter((section) => {
        if (section.items && section.items.length > 0) return true;
        if (searchQuery.trim()) {
          const categoryNameLower = section.category.name.toLowerCase();
          const searchQueryLower = searchQuery.toLowerCase().trim();
          return categoryNameLower.includes(searchQueryLower);
        }
        return false;
      });
    }

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

  const nonFavoriteSections = useMemo(
    () =>
      filteredSections.filter(
        (s) => !s.category.name.toLowerCase().includes("favorit")
      ),
    [filteredSections]
  );

  // Si cambia el tamaño base, reseteo layouts del drop
  useEffect(() => {
    setHoveredIndex(null);
    clearRowLayouts();
    forceUpdate();
  }, [nonFavoriteSections.length, clearRowLayouts]);

  const handleExpandChange = useCallback(
    (categoryId: string, isExpanded: boolean) => {
      setExpandedCategories((prev) => {
        const next = new Set(prev);
        if (isExpanded) next.add(categoryId);
        else next.delete(categoryId);
        return next;
      });
    },
    []
  );

  const collapseIfExpanded = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      if (!prev.has(categoryId)) return prev;
      const next = new Set(prev);
      next.delete(categoryId);
      return next;
    });
  }, []);

  // --- DRAG categorías ---
  const handleDragStart = useCallback(
    (itemId: string, index: number, startX?: number, startY?: number) => {
      collapseIfExpanded(itemId);

      const section = filteredSections.find((s) => s.category.id === itemId);
      if (!section) return;
      if (section.category.name.toLowerCase().includes("favorit")) return;

      dragTranslateX.value = 0;
      dragTranslateY.value = 0;
      dragScale.value = withSpring(1.05);

      const nonFav = filteredSections.filter(
        (s) => !s.category.name.toLowerCase().includes("favorit")
      );
      const realIndex = nonFav.findIndex((s) => s.category.id === itemId);
      if (realIndex === -1) return;

      const newDragged = {
        id: section.category.id,
        name: section.category.name,
        originalIndex: realIndex,
        itemCount: section.items?.length || 0,
        startX,
        startY,
      };

      draggedItemRef.current = newDragged;
      setDraggedItem(newDragged);
      setIsDragging(true);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },
    [
      filteredSections,
      collapseIfExpanded,
      dragTranslateX,
      dragTranslateY,
      dragScale,
    ]
  );

  const handleDragMove = useCallback(
    (translationY: number) => {
      dragTranslateY.value = translationY;

      const currentIndex = draggedItem?.originalIndex ?? 0;
      const nonFavLen = nonFavoriteSections.length;

      // Cambiar de slot cuando el centro cruza
      const indexOffset = Math.floor((translationY + 68 / 2) / 68);
      const proposed = currentIndex + indexOffset;
      const newIndex = Math.max(0, Math.min(proposed, nonFavLen));

      if (newIndex !== hoveredIndex) {
        setHoveredIndex(newIndex);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [draggedItem, hoveredIndex, nonFavoriteSections.length, dragTranslateY]
  );

  const handleDragEnd = useCallback(
    async (finalY: number) => {
      const currentDraggedItem = draggedItem || draggedItemRef.current;
      if (!currentDraggedItem || !userId) {
        // limpieza rápida
        draggedItemRef.current = null;
        setDraggedItem(null);
        setIsDragging(false);
        setHoveredIndex(null);
        dragTranslateY.value = 0;
        dragScale.value = 1;
        return;
      }

      // --- LIMPIEZA INSTANTÁNEA DE UI ---
      draggedItemRef.current = null;
      setIsDragging(false);
      setDraggedItem(null);
      setHoveredIndex(null);
      dragTranslateY.value = 0;
      dragScale.value = 1;

      try {
        const currentIndex = currentDraggedItem.originalIndex;
        const indexOffset = Math.floor((finalY + 68 / 2) / 68);
        const nonFavLen = nonFavoriteSections.length;
        const newIndex = Math.max(
          0,
          Math.min(currentIndex + indexOffset, nonFavLen)
        );

        if (currentIndex === newIndex || isReordering) {
          return;
        }

        setIsReordering(true);

        const nonFav = nonFavoriteSections;
        const visualOrder = nonFav.map((s) => s.category.id);
        const [moved] = visualOrder.splice(currentIndex, 1);
        visualOrder.splice(newIndex, 0, moved);

        const updates = visualOrder.map((categoryId, index) => ({
          user_id: userId,
          category_id: categoryId,
          position: index,
        }));
        setCategoryOrder(updates);

        // Guardado en BD (no bloquea UI)
        (async () => {
          try {
            for (const update of updates) {
              await orderService.updateCategoryOrder(
                userId,
                update.category_id,
                update.position
              );
            }
            await orderService.flushUpdates();
            await loadCustomOrder();
          } catch (error) {
            console.error("Error actualizando base de datos:", error);
          } finally {
            setIsReordering(false);
          }
        })();
      } catch (error) {
        console.error("Error en handleDragEnd:", error);
        setIsReordering(false);
      }
    },
    [
      draggedItem,
      userId,
      isReordering,
      nonFavoriteSections,
      loadCustomOrder,
      dragScale,
      dragTranslateY,
    ]
  );

  // --- DRAG TRUCOS (igual que tenías) ---
  const handleTrickDragStart = useCallback(
    (
      trickId: string,
      categoryId: string,
      index: number,
      startX: number,
      startY: number
    ) => {
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
      if (!trickData) return;

      trickDragTranslateX.value = 0;
      trickDragTranslateY.value = 0;
      trickDragScale.value = withSpring(1.05);

      const newDraggedTrick = {
        id: trickId,
        title: trickData.title,
        categoryId,
        originalIndex: index,
        data: trickData,
        startX,
        startY,
      };

      draggedTrickRef.current = newDraggedTrick;
      isDraggingTrickRef.current = true;
      setDraggedTrick(newDraggedTrick);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [filteredSections, trickDragTranslateX, trickDragTranslateY, trickDragScale]
  );

  const handleTrickDragMove = useCallback(
    (translationX: number, translationY: number) => {
      if (!draggedTrickRef.current || !isDraggingTrickRef.current) return;
      trickDragTranslateX.value = translationX;
      trickDragTranslateY.value = translationY;
    },
    [trickDragTranslateX, trickDragTranslateY]
  );

  const handleTrickDragEnd = useCallback(
    async (finalX: number, finalY: number) => {
      const currentDraggedTrick = draggedTrickRef.current;
      if (!currentDraggedTrick || !userId) {
        resetTrickDragState();
        return;
      }
      resetTrickDragState();
      if (
        !dropTargetCategoryId ||
        dropTargetCategoryId === currentDraggedTrick.categoryId
      ) {
        return;
      }
      try {
        const moveTrick = async () => {
          try {
            await supabase
              .from("trick_categories")
              .delete()
              .eq("trick_id", currentDraggedTrick.id)
              .eq("category_id", currentDraggedTrick.categoryId);
            await supabase.from("trick_categories").insert({
              trick_id: currentDraggedTrick.id,
              category_id: dropTargetCategoryId,
            });
            refresh();
          } catch (error) {
            console.error("Error moviendo truco:", error);
          }
        };
        moveTrick();
      } catch (error) {
        console.error("Error en handleTrickDragEnd:", error);
      }
    },
    [userId, dropTargetCategoryId, refresh]
  );

  const resetTrickDragState = useCallback(() => {
    draggedTrickRef.current = null;
    isDraggingTrickRef.current = false;
    setDraggedTrick(null);
    setDropTargetCategoryId(null);
    trickDragTranslateX.value = 0;
    trickDragTranslateY.value = 0;
    trickDragScale.value = 1;
  }, [trickDragTranslateX, trickDragTranslateY, trickDragScale]);

  // Totales
  useEffect(() => {
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
      if (isFavoritesCategory) return acc;
      return acc + (section.items?.length || 0);
    }, 0);
    setTotalTricksCount(total);
  }, [sections]);

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

  // Fetch item
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
          } catch {
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

          if (categoryData) categoryName = categoryData.name;
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
          photos,
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

  // CRUD categorías
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
          params: { id: itemData.id, trick: JSON.stringify(itemData) },
        });
      }
    },
    [router, fetchItemData]
  );

  // Scroll
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(e.nativeEvent.contentOffset.y);
  }, []);

  // === computeDropY: lo colocamos DESPUÉS de tener filteredSections y nonFavoriteSections ===
  const DROP_LINE_HALF = 3;
  const CATEGORY_ROW_HEIGHT = 68;

  const computeDropY = useCallback((): number | null => {
    if (!isDragging || hoveredIndex == null) return null;

    const nonFav = nonFavoriteSections;
    if (nonFav.length === 0) return null;

    if (hoveredIndex < 0) return null;
    if (hoveredIndex > nonFav.length) return null;

    // Después de la última fila
    if (hoveredIndex === nonFav.length) {
      const lastId = nonFav[nonFav.length - 1]?.category.id;
      const lastLayout = lastId ? rowLayoutsRef.current.get(lastId) : undefined;
      if (lastLayout) {
        const y = lastLayout.y + lastLayout.height - scrollY + 4;
        return Math.max(0, y - DROP_LINE_HALF);
      }
      const approxY =
        nonFav.length * CATEGORY_ROW_HEIGHT - scrollY + 4 - DROP_LINE_HALF;
      return Math.max(0, approxY);
    }

    // Antes de la fila hoveredIndex
    const targetId = nonFav[hoveredIndex].category.id;
    const targetLayout = rowLayoutsRef.current.get(targetId);
    if (targetLayout) {
      const y = targetLayout.y - scrollY - 4;
      return Math.max(0, y - DROP_LINE_HALF);
    }

    const approxY =
      hoveredIndex * CATEGORY_ROW_HEIGHT - scrollY - DROP_LINE_HALF;
    return Math.max(0, approxY);
  }, [isDragging, hoveredIndex, nonFavoriteSections, scrollY]);

  // Header / footer / empty
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

  // Render categoría (medimos layout de filas no-favoritas)
  const renderCategory = useCallback(
    ({ item }: { item: any; index: number }) => {
      const isFavorites = item.category.name.toLowerCase().includes("favorit");
      const canDrag = !hasActiveSearchOrFilters && !isFavorites;

      const nonFavoriteIndex = nonFavoriteSections.findIndex(
        (s) => s.category.id === item.category.id
      );

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

      return (
        <View
          onLayout={(e) => {
            const { y, height } = e.nativeEvent.layout;
            registerRowLayout(item.category.id, y, height);
          }}
        >
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
            draggedItemId={draggedItem?.id || null}
            hoveredIndex={hoveredIndex}
            onMoreOptions={() => handleMoreOptions(item.category)}
            onToggleExpand={() =>
              handleExpandChange(item.category.id, !item.isExpanded)
            }
          />
        </View>
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
      nonFavoriteSections,
      handleExpandChange,
      handleTrickDragStart,
      handleTrickDragMove,
      handleTrickDragEnd,
      draggedTrick,
      dropTargetCategoryId,
      registerRowLayout,
    ]
  );

  const keyExtractor = useCallback((item: any) => item.category.id, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !loadingMore) {
      loadMore();
    }
  }, [hasMore, loadingMore, loadMore]);

  const mainContent = (
    <View
      ref={overlayContainerRef}
      style={{ flex: 1 }}
      onLayout={measureOverlayContainer}
    >
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
          paddingBottom: NAVBAR_HEIGHT + (BOTTOM_SPACING || 0),
        }}
        drawDistance={200}
        removeClippedSubviews={true}
        estimatedListSize={{ height: 600, width: 350 }}
        scrollEnabled={!isDragging && !isDraggingTrickRef.current}
        onScrollBeginDrag={measureOverlayContainer}
        onMomentumScrollBegin={measureOverlayContainer}
        onMomentumScrollEnd={measureOverlayContainer}
        onScrollEndDrag={measureOverlayContainer}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />

      {/* Overlay: tarjeta que sigue al dedo (centrada en X) */}
      <DragOverlay
        draggedItem={draggedItem}
        translateX={dragTranslateX}
        translateY={dragTranslateY}
        scale={dragScale}
        containerLeft={containerLeft}
        containerTop={containerTop}
        containerWidth={containerWidth}
      />

      {/* Overlay: línea de drop calculada con layouts + scroll */}
      <DropLineOverlay
        visible={isDragging && hoveredIndex != null}
        y={computeDropY()}
      />
    </View>
  );

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
      {/* Overlay de TRUCOS */}
      <TrickDragOverlay
        draggedTrick={draggedTrick}
        translateX={trickDragTranslateX}
        translateY={trickDragTranslateY}
        scale={trickDragScale}
      />

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

        {/* Modales */}
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
        />
      </StyledView>
    </GestureHandlerRootView>
  );
});

export default LibrariesSection;
