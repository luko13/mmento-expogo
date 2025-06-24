// components/home/LibrariesSection.tsx
"use client";

import { useState, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { AntDesign, Feather } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { supabase } from "../../lib/supabase";
import {
  type Category,
  createCategory,
  deleteCategory,
  updateCategory,
} from "../../utils/categoryService";
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

  // Fetch item data - simplified without encryption
  const fetchItemData = async (item: any) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      if (item.type === "magic") {
        // Get trick data directly
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

        // Parse angles if necessary
        let angles = data.angles;
        if (angles && typeof angles === "string") {
          try {
            angles = JSON.parse(angles);
          } catch (e) {
            angles = [];
          }
        }

        // Get category name
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

        // Get photos if any (assuming you have a trick_photos table)
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

      // Handle other types (technique, gimmick) similarly if needed
      return null;
    } catch (error) {
      console.error("Error in fetchItemData:", error);
      return null;
    }
  };

  // Handle category actions
  const handleAddCategory = useCallback(async () => {
    if (!newCategoryName.trim()) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const newCategory = await createCategory(user.id, newCategoryName.trim());

      if (newCategory) {
        refresh();
      }

      setNewCategoryName("");
      setAddCategoryModalVisible(false);
    } catch (error) {
      console.error("Error adding category:", error);
    }
  }, [newCategoryName, refresh]);

  const handleEditCategory = useCallback(async () => {
    if (!editingCategory || !newCategoryName.trim()) return;

    try {
      const success = await updateCategory(
        editingCategory.id,
        newCategoryName.trim()
      );

      if (success) {
        refresh();
      }

      setEditingCategory(null);
      setNewCategoryName("");
      setEditCategoryModalVisible(false);
    } catch (error) {
      console.error("Error updating category:", error);
    }
  }, [editingCategory, newCategoryName, refresh]);

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
    if (!categoryToDelete) return;

    try {
      const success = await deleteCategory(categoryToDelete.id);
      if (success) {
        refresh();
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    } finally {
      setShowDeleteModal(false);
      setCategoryToDelete(null);
    }
  }, [categoryToDelete, refresh]);

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
              fontSize: 20,
              color: "white",
              marginLeft: 10,
              includeFontPadding: false,
            }}
          >
            {t("librariesCount", {
              count: allCategories?.length || sections.length,
            })}
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
    [t, allCategories, sections.length]
  );

  const ListFooter = useCallback(() => {
    if (!loadingMore) return null;

    return (
      <StyledView className="py-4">
        <ActivityIndicator size="small" color="#10b981" />
      </StyledView>
    );
  }, [loadingMore]);

  const ListEmpty = useCallback(() => {
    if (loading) {
      return (
        <StyledView className="flex-1 justify-center items-center py-20">
          <ActivityIndicator size="large" color="#10b981" />
        </StyledView>
      );
    }

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
  }, [loading, searchQuery, searchFilters, t]);

  const renderSection = useCallback(
    ({ item }: { item: any }) => {
      return (
        <CollapsibleCategoryOptimized
          section={item}
          searchQuery={searchQuery}
          searchFilters={searchFilters}
          onItemPress={handleItemPress}
          onEditCategory={openEditCategoryModal}
          onDeleteCategory={handleDeleteCategory}
          onMoreOptions={handleMoreOptions}
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
    ]
  );

  const keyExtractor = useCallback((item: any) => item.category.id, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !loadingMore) {
      loadMore();
    }
  }, [hasMore, loadingMore, loadMore]);

  // Main render
  return (
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
          data={sections}
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
              refreshing={loading && sections.length === 0}
              onRefresh={refresh}
              tintColor="#10b981"
            />
          }
          contentContainerStyle={{
            paddingBottom: NAVBAR_HEIGHT + BOTTOM_SPACING,
          }}
          // Performance optimizations
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
          setNewCategoryName("");
        }}
        onConfirm={(name) => {
          setNewCategoryName(name);
          if (editingCategory) {
            handleEditCategory();
          } else {
            handleAddCategory();
          }
        }}
        initialName={editingCategory ? editingCategory.name : newCategoryName}
        mode={editingCategory ? "edit" : "create"}
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
  );
});

export default LibrariesSection;
