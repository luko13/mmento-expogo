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
import {
  AntDesign,
  Feather,
  Ionicons,
} from "@expo/vector-icons";
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
import { useEncryption } from "../../hooks/useEncryption";
import { FileEncryptionService } from "../../utils/fileEncryption";
import * as FileSystem from "expo-file-system";
import { getTrickWithEncryptedPhotos } from "../../utils/trickHelpers";
import DeleteModal from "../ui/DeleteModal";
import CantDeleteModal from "../ui/CantDeleteModal";
import CategoryActionsModal from "../ui/CategoryActionsModal";
import CategoryModal from "../ui/CategoryModal";
import { useRouter } from "expo-router";
import { usePaginatedContent } from "../../hooks/usePaginatedContent";
import CollapsibleCategoryOptimized from "./CollapsibleCategoryOptimized";
import { EncryptedContentService } from "../../services/encryptedContentService";

const StyledView = styled(View);
const StyledText = styled(Text);
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
  const [isAddCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [isEditCategoryModalVisible, setEditCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedTrickData, setSelectedTrickData] = useState<any>(null);
  const [showKeyRefreshBanner, setShowKeyRefreshBanner] = useState(false);
  
  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showCantDeleteModal, setShowCantDeleteModal] = useState(false);
  const [categoryItemCount, setCategoryItemCount] = useState(0);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedCategoryForActions, setSelectedCategoryForActions] = useState<Category | null>(null);

  // Encryption services
  const { decryptForSelf, keyPair, getPublicKey } = useEncryption();
  const encryptedService = new EncryptedContentService();
  const fileEncryptionService = new FileEncryptionService();

  // Use paginated content hook
  const {
    sections,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    allCategories, // Todas las categorías para el header
  } = usePaginatedContent(searchQuery, searchFilters);

  // Helper function to handle encrypted files
  const handleEncryptedFile = async (
    fileId: string,
    fileName: string,
    mimeType: string,
    userId: string
  ): Promise<string | null> => {
    try {
      const result = await fileEncryptionService.downloadAndDecryptFile(
        fileId,
        userId,
        getPublicKey,
        () => keyPair!.privateKey
      );

      // Convert Uint8Array to base64
      let binaryString = "";
      const chunkSize = 8192;
      for (let i = 0; i < result.data.length; i += chunkSize) {
        const chunk = result.data.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Data = btoa(binaryString);

      // Save temporarily
      const tempUri = `${FileSystem.cacheDirectory}${fileId}_${fileName}`;
      await FileSystem.writeAsStringAsync(tempUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return tempUri;
    } catch (error) {
      console.error("Error downloading encrypted file:", error);
      return null;
    }
  };

  // Fetch item data
  const fetchItemData = async (item: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      if (item.type === "magic") {
        const data = await getTrickWithEncryptedPhotos(item.id);
        if (!data) return null;

        let decryptedData = data;
        if (data.is_encrypted && decryptForSelf && keyPair) {
          if (item.is_shared) {
            const decrypted = await encryptedService.getSharedContent(
              data.id,
              "magic_tricks",
              user.id,
              decryptForSelf
            );
            if (decrypted) {
              decryptedData = { ...decrypted, photos: data.photos } as any;
            }
          } else {
            const decrypted = await encryptedService.getOwnContent(
              data.id,
              "magic_tricks",
              decryptForSelf,
              () => keyPair.privateKey
            );
            if (decrypted) {
              decryptedData = { ...decrypted, photos: data.photos } as any;
            }
          }

          // Handle encrypted files
          if (decryptedData.photo_encrypted && decryptedData.photo_url) {
            const photoUrl = await handleEncryptedFile(
              decryptedData.photo_url,
              "photo.jpg",
              "image/jpeg",
              user.id
            );
            if (photoUrl) decryptedData.photo_url = photoUrl;
          }

          if (decryptedData.effect_video_encrypted && decryptedData.effect_video_url) {
            const videoUrl = await handleEncryptedFile(
              decryptedData.effect_video_url,
              "effect_video.mp4",
              "video/mp4",
              user.id
            );
            if (videoUrl) decryptedData.effect_video_url = videoUrl;
          }

          if (decryptedData.secret_video_encrypted && decryptedData.secret_video_url) {
            const videoUrl = await handleEncryptedFile(
              decryptedData.secret_video_url,
              "secret_video.mp4",
              "video/mp4",
              user.id
            );
            if (videoUrl) decryptedData.secret_video_url = videoUrl;
          }
        }

        // Parse angles
        if (decryptedData.angles && typeof decryptedData.angles === "string") {
          try {
            decryptedData.angles = JSON.parse(decryptedData.angles);
          } catch (e) {
            decryptedData.angles = [];
          }
        } else if (!decryptedData.angles) {
          decryptedData.angles = [];
        }

        const trickData = {
          id: decryptedData.id,
          title: decryptedData.title,
          category: "Unknown",
          effect: decryptedData.effect || "",
          secret: decryptedData.secret || "",
          effect_video_url: decryptedData.effect_video_url,
          secret_video_url: decryptedData.secret_video_url,
          photo_url: decryptedData.photo_url,
          photos: decryptedData.photos || [],
          script: decryptedData.script || "",
          angles: decryptedData.angles,
          duration: decryptedData.duration || 0,
          reset: decryptedData.reset || 0,
          difficulty: decryptedData.difficulty ? Number.parseInt(decryptedData.difficulty) : 0,
          is_encrypted: data.is_encrypted,
          is_shared: item.is_shared,
          owner_info: item.is_shared ? item.owner_id : null,
        };

        // Get category name
        const { data: categoryData } = await supabase
          .from("trick_categories")
          .select("category_id")
          .eq("trick_id", item.id)
          .limit(1);

        if (categoryData && categoryData.length > 0) {
          const categoryId = categoryData[0].category_id;
          const { data: category } = await supabase
            .from("user_categories")
            .select("name")
            .eq("id", categoryId)
            .single();

          if (category) {
            trickData.category = category.name;
          }
        }

        return trickData;
      }
      // Similar logic for techniques and gimmicks...
      
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newCategory = await createCategory(user.id, newCategoryName.trim());

      if (newCategory) {
        refresh(); // Refresh the list
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
        refresh(); // Refresh the list
      }

      setEditingCategory(null);
      setNewCategoryName("");
      setEditCategoryModalVisible(false);
    } catch (error) {
      console.error("Error updating category:", error);
    }
  }, [editingCategory, newCategoryName, refresh]);

  const handleDeleteCategory = useCallback(async (categoryId: string) => {
    const category = sections.find(s => s.category.id === categoryId)?.category;
    if (!category) return;

    const categorySection = sections.find(section => section.category.id === categoryId);
    const itemCount = categorySection?.items.length || 0;

    if (itemCount > 0) {
      setCategoryToDelete({ id: category.id, name: category.name });
      setCategoryItemCount(itemCount);
      setShowCantDeleteModal(true);
      return;
    }

    setCategoryToDelete({ id: category.id, name: category.name });
    setShowDeleteModal(true);
  }, [sections]);

  const confirmDeleteCategory = useCallback(async () => {
    if (!categoryToDelete) return;

    try {
      const success = await deleteCategory(categoryToDelete.id);
      if (success) {
        refresh(); // Refresh the list
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

  const handleItemPress = useCallback(async (item: any) => {
    if (item.decryption_error) {
      setShowKeyRefreshBanner(true);
      return;
    }

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
  }, [router, fetchItemData]);

  // Render functions
  const ListHeader = useCallback(() => (
    <StyledView className="flex-row justify-between items-center mb-2 px-4">
      <StyledView className="flex-row items-center">
        <Feather name="book" size={24} color="white" />
        <StyledText className="text-white text-xl ml-2">
          {t("librariesCount", { count: allCategories?.length || sections.length })}
        </StyledText>
      </StyledView>
      <StyledTouchableOpacity
        className="p-2"
        onPress={() => setAddCategoryModalVisible(true)}
      >
        <AntDesign name="plus" size={24} color="white" />
      </StyledTouchableOpacity>
    </StyledView>
  ), [t, allCategories, sections.length]);

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
        <StyledText className="text-white/50 text-center text-lg mb-2">
          {searchQuery.trim() || searchFilters?.categories?.length
            ? t("noSearchResults", "No results found")
            : t("noCategories", "No categories found")}
        </StyledText>
        {!searchQuery.trim() && !searchFilters?.categories?.length && (
          <StyledTouchableOpacity
            className="bg-emerald-700 px-4 py-2 rounded-lg mt-2"
            onPress={() => setAddCategoryModalVisible(true)}
          >
            <StyledText className="text-white">{t("addCategory")}</StyledText>
          </StyledTouchableOpacity>
        )}
      </StyledView>
    );
  }, [loading, searchQuery, searchFilters, t]);

  const renderSection = useCallback(({ item }: { item: any }) => {
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
  }, [searchQuery, searchFilters, handleItemPress, openEditCategoryModal, handleDeleteCategory, handleMoreOptions]);

  const keyExtractor = useCallback((item: any) => item.category.id, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !loadingMore) {
      loadMore();
    }
  }, [hasMore, loadingMore, loadMore]);

  // Main render
  return (
    <StyledView className="flex-1">
      {/* Key Refresh Banner */}
      {showKeyRefreshBanner && (
        <StyledView className="bg-red-500/20 border border-red-500/50 p-3 rounded-lg mb-3 mx-4">
          <StyledView className="flex-row items-center">
            <Ionicons name="warning" size={20} color="#ef4444" />
            <StyledText className="text-white ml-2 flex-1">
              {t("decryptionError", "Some items couldn't be decrypted. Please re-enter your password.")}
            </StyledText>
            <StyledTouchableOpacity
              onPress={() => setShowKeyRefreshBanner(false)}
              className="p-1"
            >
              <AntDesign name="close" size={18} color="white" />
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      )}

      <ListHeader />
      
      {error ? (
        <StyledView className="flex-1 justify-center items-center p-4">
          <StyledText className="text-red-500 text-center mb-4">{error}</StyledText>
          <StyledTouchableOpacity
            className="bg-emerald-700 px-4 py-2 rounded-lg"
            onPress={refresh}
          >
            <StyledText className="text-white">{t("retry", "Retry")}</StyledText>
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
            width: 350
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