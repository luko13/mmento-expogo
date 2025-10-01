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
import MagicLoader from "../ui/MagicLoader";
import { useTrickDeletion } from "../../context/TrickDeletionContext";
import { paginatedContentService } from "../../utils/paginatedContentService";

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

  // Hook con booting (hidrata) + loading (red)
  const {
    sections,
    loading,
    booting,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
  } = usePaginatedContent(searchQuery, searchFilters);

  // Modales/estado UI
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

  // Totales (excluye favoritos)
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

  // Ordenar: Favoritos primero (si coincide por nombre)
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

  // Borrado -> refresh
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
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const newCategory = await createCategory(user.id, name);
        if (newCategory) refresh();
        setAddCategoryModalVisible(false);
      } catch (e) {
        console.error(e);
      }
    },
    [refresh]
  );

  const handleEditCategory = useCallback(
    async (name: string) => {
      if (!editingCategory) return;
      try {
        const success = await updateCategory(editingCategory.id, name);
        if (success) refresh();
        setEditingCategory(null);
        setEditCategoryModalVisible(false);
      } catch (e) {
        console.error(e);
      }
    },
    [editingCategory, refresh]
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
      const ok = await deleteCategory(categoryToDelete.id);
      if (ok) refresh();
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

  const fetchItemData = useCallback(async (item: any) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      if (item.type === "magic") {
        const { data } = await supabase
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

        if (!data) return null;

        let angles: string[] = [];
        if (Array.isArray(data.angles)) angles = data.angles;
        else if (typeof data.angles === "string") {
          try {
            angles = JSON.parse(data.angles);
          } catch {
            angles = [];
          }
        }

        let categoryName = "Unknown";
        if (data.trick_categories && data.trick_categories.length > 0) {
          const categoryId = data.trick_categories[0].category_id;
          const { data: cat } = await supabase
            .from("user_categories")
            .select("name")
            .eq("id", categoryId)
            .single();
          if (cat) categoryName = cat.name;
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
          angles,
          duration: data.duration || 0,
          reset: data.reset || 0,
          difficulty: data.difficulty || 0,
          notes: data.notes || "",
          is_shared: item.is_shared || false,
          owner_info: item.is_shared ? item.owner_id : null,
        };
      }

      return null;
    } catch (e) {
      console.error("fetchItemData error:", e);
      return null;
    }
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
    [fetchItemData, router]
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

  const handleEndReached = useCallback(() => {
    if (hasMore && !loadingMore) loadMore();
  }, [hasMore, loadingMore, loadMore]);

  const mainContent = (
    <View style={{ flex: 1 }}>
      <FlashList
        ref={flatListRef}
        data={orderedSections}
        renderItem={renderCategory}
        keyExtractor={keyExtractor}
        ListEmptyComponent={
          booting || (loading && sections.length === 0) ? null : ListEmpty
        }
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
        scrollEnabled={true}
      />
    </View>
  );

  // 1) Hidratación: si hay snapshot, se ve; si no, solo cabecera (sin vacío/loader)
  if (booting) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StyledView className="flex-1">
          <ListHeader />
          {sections.length > 0 ? mainContent : null}
        </StyledView>
      </GestureHandlerRootView>
    );
  }

  // 2) Primera carga real sin snapshot: loader centrado (sin “no categories” intermedio)
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

  // 3) Render normal
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
