// components/home/LibrariesSection.tsx
"use client";

import { useState, useCallback, memo, useEffect, useMemo, useRef } from "react";
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
import { AntDesign, Feather } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { type Category } from "../../utils/categoryService";
import TrickViewScreen from "../TrickViewScreen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { SearchFilters } from "./CompactSearchBar";
import DeleteModal from "../ui/DeleteModal";
import CantDeleteModal from "../ui/CantDeleteModal";
import CategoryActionsModal from "../ui/CategoryActionsModal";
import CategoryModal from "../ui/CategoryModal";
import { useRouter } from "expo-router";
import { useLibraryData } from "../../context/LibraryDataContext";

import { localDataService } from "../../services/LocalDataService";

import CollapsibleCategoryOptimized from "./CollapsibleCategoryOptimized";
import { fontNames } from "../../app/_layout";
import MagicLoader from "../ui/MagicLoader";
import { useTrickDeletion } from "../../context/TrickDeletionContext";
import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

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
  const {
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
  } = useLibraryData();

  useEffect(() => {
    applyFilters(searchQuery, searchFilters);
  }, [searchQuery, searchFilters, applyFilters]);

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

  const flatListRef = useRef<FlashList<any> | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const totalTricksCount = useMemo(() => {
    return sections.reduce((acc, section) => {
      const name = (section.category?.name || "").toLowerCase().trim();
      const isFav = [
        "favoritos",
        "favorites",
        "favourites",
        "favorito",
        "favorite",
        "favourite",
      ].includes(name);
      if (isFav) return acc;
      return acc + (section.items?.length || 0);
    }, 0);
  }, [sections]);

  const orderedSections = useMemo(() => {
    const sorted = [...sections].sort((a, b) => {
      const aFav = a.category.name?.toLowerCase?.().includes("favorit");
      const bFav = b.category.name?.toLowerCase?.().includes("favorit");
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });
    return sorted.map((sec) => ({
      ...sec,
      isExpanded: expandedCategories.has(sec.category.id),
    }));
  }, [sections, expandedCategories]);

  useEffect(() => {
    if (deletedTrickId) refresh();
  }, [deletedTrickId, refresh]);

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

  const handleAddCategory = useCallback(
    async (name: string) => {
      try {
        await createCategory(name);
        setAddCategoryModalVisible(false);
      } catch (e) {
        console.error(e);
      }
    },
    [createCategory]
  );

  const handleEditCategory = useCallback(
    async (name: string) => {
      if (!editingCategory) return;
      try {
        await updateCategory(editingCategory.id, name);
        setEditingCategory(null);
        setEditCategoryModalVisible(false);
      } catch (e) {
        console.error(e);
      }
    },
    [editingCategory, updateCategory]
  );

  const handleDeleteCategory = useCallback(
    (categoryId: string) => {
      const categorySection = sections.find(
        (s) => s.category.id === categoryId
      );
      const itemCount = categorySection?.items.length || 0;

      if (itemCount > 0) {
        setCategoryToDelete({
          id: categoryId,
          name: categorySection?.category.name || "",
        });
        setCategoryItemCount(itemCount);
        setShowCantDeleteModal(true);
        return;
      }
      setCategoryToDelete({
        id: categoryId,
        name: categorySection?.category.name || "",
      });
      setShowDeleteModal(true);
    },
    [sections]
  );

  const confirmDeleteCategory = useCallback(async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete.id);
    } finally {
      setShowDeleteModal(false);
      setCategoryToDelete(null);
    }
  }, [categoryToDelete, deleteCategory]);

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
    (item: any) => {
      console.log("🟠 [LibrariesSection] handleItemPress called with item:", {
        id: item.id,
        title: item.title,
        category_ids: item.category_ids,
        photos: item.photos,
        photosCount: item.photos?.length || 0,
      });

      try {
        const categoryName =
          allCategories.find((cat) => item.category_ids?.includes(cat.id))
            ?.name || "Unknown";

        const itemData = {
          id: item.id,
          title: item.title,
          category: categoryName,
          effect: item.effect || "",
          secret: item.secret || "",
          effect_video_url: item.effect_video_url || null,
          secret_video_url: item.secret_video_url || null,
          photo_url: item.photo_url || null,
          photos: item.photos || [], // Usar las fotos del cache
          script: "",
          angles: Array.isArray(item.angles) ? item.angles : [],
          duration: item.duration || 0,
          reset: item.reset || 0,
          difficulty: item.difficulty || 0,
          notes: item.notes || "",
          is_shared: item.is_shared || false,
          owner_info: null,
          user_id: item.user_id || null,
          is_public: item.is_public || false,
        };

        console.log("🟠 [LibrariesSection] Navigating with data:", {
          id: itemData.id,
          title: itemData.title,
          category: itemData.category,
          photosCount: itemData.photos.length,
          user_id: itemData.user_id,
          is_public: itemData.is_public,
        });

        router.push({
          pathname: "/(app)/trick/[id]",
          params: {
            id: itemData.id,
            trick: JSON.stringify(itemData),
          },
        });

        console.log("🟠 [LibrariesSection] Navigation triggered successfully");
      } catch (error) {
        console.error("❌ [LibrariesSection] Error in handleItemPress:", error);
      }
    },
    [allCategories, router]
  );

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

  const renderCategory = useCallback(
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
          isDragEnabled={false}
          onExpandChange={(isExpanded) =>
            handleExpandChange(item.category.id, isExpanded)
          }
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
      handleExpandChange,
    ]
  );

  const keyExtractor = useCallback((item: any) => item.category.id, []);

  const mainContent = (
    <View style={{ flex: 1 }}>
      <FlashList
        ref={flatListRef}
        data={orderedSections}
        renderItem={renderCategory}
        keyExtractor={keyExtractor}
        ListEmptyComponent={
          initializing || (loading && sections.length === 0) ? null : ListEmpty
        }
        estimatedItemSize={100}
        getItemType={() => "category"}
        refreshControl={
          <RefreshControl
            refreshing={loading && sections.length > 0}
            onRefresh={refresh}
            tintColor="rgba(255, 255, 255, 0.6)"
            title=""
            titleColor="rgba(255, 255, 255, 0.6)"
          />
        }
        contentContainerStyle={{
          paddingBottom: NAVBAR_HEIGHT + (BOTTOM_SPACING || 0),
        }}
        drawDistance={200}
        removeClippedSubviews={true}
        estimatedListSize={{
          height: 600,
          width: SCREEN_WIDTH,
        }}
        scrollEnabled={true}
      />
    </View>
  );

  if (initializing) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StyledView className="flex-1">
          <ListHeader />
          {sections.length > 0 ? (
            mainContent
          ) : (
            <StyledView className="flex-1 justify-center items-center">
              <MagicLoader size="large" />
            </StyledView>
          )}
        </StyledView>
      </GestureHandlerRootView>
    );
  }

  if (loading && sections.length === 0 && !error) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StyledView className="flex-1">
          <ListHeader />
          <StyledView className="flex-1 justify-center items-center">
            <MagicLoader size="large" />
          </StyledView>
        </StyledView>
      </GestureHandlerRootView>
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
          mainContent
        )}

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
            if (selectedCategoryForActions)
              openEditCategoryModal(selectedCategoryForActions);
            setShowActionsModal(false);
          }}
          onDelete={() => {
            if (selectedCategoryForActions)
              handleDeleteCategory(selectedCategoryForActions.id);
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
          categoryName={selectedCategoryForActions?.name}
        />
      </StyledView>
    </GestureHandlerRootView>
  );
});

export default LibrariesSection;
