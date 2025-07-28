// components/home/LibrariesSection.tsx
"use client";

import { useState, useCallback, memo, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Platform,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { AntDesign, Feather, MaterialIcons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { supabase } from "../../lib/supabase";
import {
  type Category,
  createCategory,
  deleteCategory,
  updateCategory,
} from "../../utils/categoryService";
import { orderService } from "../../services/orderService";
import {
  useSimpleDragDrop,
  type DragDropItem,
} from "../../hooks/useSimpleDragDrop";
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

  // Initialize simple drag and drop (SOLO UNA VEZ)
  const {
    dragState,
    createDragGesture,
    isDraggingItem,
    draggedAnimatedStyle,
    getDragOverStyle,
    getCategoryDragOverStyle,
    registerCategoryLayout,
    registerItemLayout,
    setDraggedOver,
    setDraggedOverCategory,
    isDragging,
  } = useSimpleDragDrop({
    enabled: !hasActiveSearchOrFilters && !isReordering,
    onDragEnd: handleDragEnd,
  });

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

    if (!hasActiveSearch) {
      return orderedSections;
    }

    return orderedSections.filter((section) => {
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
  }, [orderedSections, searchQuery, hasActiveSearchOrFilters]);

  // Handle drag end
  async function handleDragEnd(
    draggedItem: DragDropItem,
    targetCategory?: string
  ) {
    if (!userId || isReordering || !targetCategory) return;

    console.log("🎯 handleDragEnd:", draggedItem.id, "->", targetCategory);

    setIsReordering(true);
    try {
      if (draggedItem.type === "category") {
        if (targetCategory !== draggedItem.id) {
          // No permitir mover favoritos
          const draggedSection = sections.find(
            (s) => s.category.id === draggedItem.id
          );
          if (
            !draggedSection?.category.name.toLowerCase().includes("favorit")
          ) {
            await reorderCategories(draggedItem.id, targetCategory);
          }
        }
      } else if (draggedItem.type === "trick") {
        // Moving to different category
        if (targetCategory !== draggedItem.categoryId) {
          await orderService.moveTrickToCategory(
            userId,
            draggedItem.id,
            draggedItem.categoryId!,
            targetCategory,
            0 // Add to end
          );
        }
      }

      // Reload custom order and refresh data
      await loadCustomOrder();
      refresh();
    } catch (error) {
      console.error("Error handling drag end:", error);
    } finally {
      setIsReordering(false);
    }
  }

  // Reorder categories
  const reorderCategories = async (draggedId: string, targetId: string) => {
    if (!userId) return;

    const currentOrder = [...categoryOrder];
    const draggedIndex = currentOrder.findIndex(
      (o) => o.category_id === draggedId
    );
    const targetIndex = currentOrder.findIndex(
      (o) => o.category_id === targetId
    );

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Don't allow moving favorites
    const draggedSection = sections.find((s) => s.category.id === draggedId);
    if (draggedSection?.category.name.toLowerCase().includes("favorit")) {
      return;
    }

    // Reorder array
    const [removed] = currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, removed);

    // Update positions
    currentOrder.forEach((order, index) => {
      orderService.updateCategoryOrder(userId, order.category_id, index);
    });

    setCategoryOrder(currentOrder);
  };

  // Reorder tricks within category
  const reorderTricks = async (
    categoryId: string,
    draggedId: string,
    targetId: string
  ) => {
    if (!userId) return;

    const categoryTricks = trickOrders.get(categoryId) || [];
    const currentOrder = [...categoryTricks];

    const draggedIndex = currentOrder.findIndex(
      (o) => o.trick_id === draggedId
    );
    const targetIndex = currentOrder.findIndex((o) => o.trick_id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder array
    const [removed] = currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, removed);

    // Update positions
    currentOrder.forEach((order, index) => {
      orderService.updateTrickOrder(userId, categoryId, order.trick_id, index);
    });

    const newOrders = new Map(trickOrders);
    newOrders.set(categoryId, currentOrder);
    setTrickOrders(newOrders);
  };

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
    [totalTricksCount]
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

  const renderSection = useCallback(
    ({ item }: { item: any }) => {
      const isFavoritesCategory = item.category.name
        .toLowerCase()
        .includes("favorit");

      return (
        <CollapsibleCategoryOptimized
          section={item}
          searchQuery={searchQuery}
          searchFilters={searchFilters}
          onItemPress={handleItemPress}
          onEditCategory={openEditCategoryModal}
          onDeleteCategory={handleDeleteCategory}
          onMoreOptions={handleMoreOptions}
          // Props simplificados para drag
          createDragGesture={
            !isFavoritesCategory ? createDragGesture : undefined
          }
          isDraggingItem={isDraggingItem}
          draggedAnimatedStyle={draggedAnimatedStyle}
          getDragOverStyle={getDragOverStyle}
          getCategoryDragOverStyle={getCategoryDragOverStyle}
          setDraggedOverCategory={setDraggedOverCategory}
          isDragging={isDragging}
          isDragEnabled={!hasActiveSearchOrFilters && !isFavoritesCategory}
          dragState={dragState}
          userId={userId}
          registerCategoryLayout={registerCategoryLayout}
          registerItemLayout={registerItemLayout}
          onDraggedOver={(categoryId) => setDraggedOverCategory(categoryId)}
          dragGesture={null} // No longer needed
          setDraggedOver={setDraggedOver}
        />
      );
    },
    [
      searchQuery,
      searchFilters,
      handleItemPress,
      openEditCategoryModal,
      handleDeleteCategory,
      handleMoreOptions,
      hasActiveSearchOrFilters,
      createDragGesture,
      isDraggingItem,
      draggedAnimatedStyle,
      getDragOverStyle,
      getCategoryDragOverStyle,
      setDraggedOverCategory,
      isDragging,
      dragState,
      userId,
      registerCategoryLayout,
      registerItemLayout,
      setDraggedOver,
    ]
  );

  const keyExtractor = useCallback((item: any) => item.category.id, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !loadingMore) {
      loadMore();
    }
  }, [hasMore, loadingMore, loadMore]);

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
          <FlashList
            data={filteredSections}
            renderItem={renderSection}
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
          />
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
