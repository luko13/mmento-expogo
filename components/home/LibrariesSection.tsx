"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
  ScrollView,
  Platform,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import {
  AntDesign,
  FontAwesome,
  MaterialCommunityIcons,
  MaterialIcons,
  Feather,
  FontAwesome5,
  Ionicons,
} from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { supabase } from "../../lib/supabase";
import {
  type Category,
  getUserCategories,
  createCategory,
  deleteCategory,
  updateCategory,
  getTricksByCategory,
  ensureDefaultCategories,
} from "../../utils/categoryService";
import TrickViewScreen from "../TrickViewScreen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { SearchFilters } from "./CompactSearchBar";
import { EncryptedContentService } from "../../services/encryptedContentService";
import { useEncryption } from "../../hooks/useEncryption";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledTextInput = styled(TextInput);

const { width, height } = Dimensions.get("window");

// Calculate safe area for navigation bar
const NAVBAR_HEIGHT = 60;
const BOTTOM_SPACING = Platform.OS === "ios" ? 20 : 10;

interface LibraryItem {
  id: string;
  title: string;
  type: "magic" | "gimmick" | "technique" | "script";
  difficulty?: string | null;
  status?: string;
  created_at?: string;
  duration?: number | null;
  category_id?: string;
  tags?: string[]; // Store tag IDs
  // Campos adicionales para gimmicks y técnicas
  description?: string;
  notes?: string;
  reset?: number | null;
  angles?: string[];
  special_materials?: string[];
}

interface CategorySection {
  category: Category;
  items: LibraryItem[];
}

interface LibrariesSectionProps {
  searchQuery?: string;
  searchFilters?: SearchFilters;
}

export default function LibrariesSection({
  searchQuery = "",
  searchFilters,
}: LibrariesSectionProps) {
  const { t } = useTranslation();
  const [isAddCategoryModalVisible, setAddCategoryModalVisible] =
    useState(false);
  const [isEditCategoryModalVisible, setEditCategoryModalVisible] =
    useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySections, setCategorySections] = useState<CategorySection[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [selectedTrickData, setSelectedTrickData] = useState<any>(null);
  const [allItems, setAllItems] = useState<LibraryItem[]>([]);

  const { decryptForSelf, keyPair } = useEncryption();
  const encryptedService = new EncryptedContentService();
  // Fetch user categories and all items (tricks, techniques, gimmicks)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.error("No user found");
          return;
        }

        // Ensure user has default categories
        await ensureDefaultCategories(user.id);

        // Get user categories
        const userCategories = await getUserCategories(user.id);
        setCategories(userCategories);

        // Get all items for each category
        const sections: CategorySection[] = [];
        let allItemsArray: LibraryItem[] = [];

        for (const category of userCategories) {
          const categoryItems: LibraryItem[] = [];

          // 1. Get magic tricks for this category
          const tricks = await getTricksByCategory(category.id);

          // Transform tricks to LibraryItem format and fetch tags
          const trickItems: LibraryItem[] = await Promise.all(
            tricks.map(async (trick) => {
              // Fetch tags for this trick
              const { data: trickTags } = await supabase
                .from("trick_tags")
                .select("tag_id")
                .eq("trick_id", trick.id);

              const tagIds =
                trickTags?.map((item) => item.tag_id).filter(Boolean) || [];

              return {
                id: trick.id,
                title: trick.title,
                type: "magic" as const,
                difficulty: trick.difficulty,
                status: trick.status,
                created_at: trick.created_at,
                duration: trick.duration,
                category_id: category.id,
                tags: tagIds,
                reset: trick.reset,
                notes: trick.notes,
              };
            })
          );

          // 2. Get techniques for this category
          const { data: techniques } = await supabase
            .from("techniques")
            .select("*")
            .eq("user_id", user.id);

          // Filter techniques by category
          const techniqueItems: LibraryItem[] = [];
          if (techniques) {
            for (const technique of techniques) {
              // Check if technique belongs to this category
              const { data: techCategory } = await supabase
                .from("technique_categories")
                .select("category_id")
                .eq("technique_id", technique.id)
                .eq("category_id", category.id)
                .single();

              if (techCategory) {
                // Descifrar si está cifrada
                let decryptedTechnique = technique;
                if (technique.is_encrypted && decryptForSelf && keyPair) {
                  const decrypted = await encryptedService.getOwnContent(
                    technique.id,
                    "techniques",
                    decryptForSelf,
                    () => keyPair.privateKey
                  );
                  if (decrypted) {
                    decryptedTechnique = decrypted;
                  }
                }
                // Fetch tags for this technique
                const { data: techniqueTags } = await supabase
                  .from("technique_tags")
                  .select("tag_id")
                  .eq("technique_id", technique.id);

                const tagIds =
                  techniqueTags?.map((item) => item.tag_id).filter(Boolean) ||
                  [];

                // Parse angles if stored as JSON string
                let angles = [];
                if (technique.angles) {
                  try {
                    angles =
                      typeof technique.angles === "string"
                        ? JSON.parse(technique.angles)
                        : technique.angles;
                  } catch {
                    angles = [];
                  }
                }

                techniqueItems.push({
                  id: decryptedTechnique.id,
                  title: decryptedTechnique.name, // Ahora descifrado
                  type: "technique" as const,
                  difficulty: decryptedTechnique.difficulty,
                  status: decryptedTechnique.status,
                  created_at: decryptedTechnique.created_at,
                  category_id: category.id,
                  tags: tagIds,
                  description: decryptedTechnique.description, // Descifrado
                  notes: decryptedTechnique.notes, // Descifrado
                  angles: angles,
                  special_materials: decryptedTechnique.special_materials,
                });
              }
            }
          }

          // 3. Get gimmicks for this category
          const { data: gimmicks } = await supabase
            .from("gimmicks")
            .select("*")
            .eq("user_id", user.id);

          // Filter gimmicks by category
          const gimmickItems: LibraryItem[] = [];
          if (gimmicks) {
            for (const gimmick of gimmicks) {
              // Check if gimmick belongs to this category
              const { data: gimmickCategory } = await supabase
                .from("gimmick_categories")
                .select("category_id")
                .eq("gimmick_id", gimmick.id)
                .eq("category_id", category.id)
                .single();

              if (gimmickCategory) {
                // Fetch tags for this gimmick (if you have a gimmick_tags table)
                // For now, we'll use an empty array
                const tagIds: string[] = [];

                // Parse angles if stored as JSON string
                let angles = [];
                if (gimmick.angles) {
                  try {
                    angles =
                      typeof gimmick.angles === "string"
                        ? JSON.parse(gimmick.angles)
                        : gimmick.angles;
                  } catch {
                    angles = [];
                  }
                }

                gimmickItems.push({
                  id: gimmick.id,
                  title: gimmick.name,
                  type: "gimmick" as const,
                  difficulty: gimmick.difficulty,
                  status: gimmick.status,
                  created_at: gimmick.created_at,
                  category_id: category.id,
                  tags: tagIds,
                  description: gimmick.description,
                  notes: gimmick.notes,
                  angles: angles,
                  special_materials: gimmick.special_materials,
                  reset: gimmick.reset_time,
                });
              }
            }
          }

          // Combine all items for this category
          const allCategoryItems = [
            ...trickItems,
            ...techniqueItems,
            ...gimmickItems,
          ];

          sections.push({
            category,
            items: allCategoryItems,
          });

          // Add to all items array
          allItemsArray = [...allItemsArray, ...allCategoryItems];
        }

        setCategorySections(sections);
        setAllItems(allItemsArray);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No user found");
        return;
      }

      const newCategory = await createCategory(
        user.id,
        newCategoryName.trim(),
        newCategoryDescription.trim() || undefined
      );

      if (newCategory) {
        setCategories([...categories, newCategory]);
        setCategorySections([
          ...categorySections,
          {
            category: newCategory,
            items: [],
          },
        ]);
      }

      setNewCategoryName("");
      setNewCategoryDescription("");
      setAddCategoryModalVisible(false);
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  // Edit category
  const handleEditCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return;

    try {
      const success = await updateCategory(
        editingCategory.id,
        newCategoryName.trim(),
        newCategoryDescription.trim() || undefined
      );

      if (success) {
        // Update categories state
        const updatedCategories = categories.map((cat) =>
          cat.id === editingCategory.id
            ? {
                ...cat,
                name: newCategoryName.trim(),
                description: newCategoryDescription.trim() || undefined,
              }
            : cat
        );
        setCategories(updatedCategories);

        // Update category sections
        const updatedSections = categorySections.map((section) =>
          section.category.id === editingCategory.id
            ? {
                ...section,
                category: {
                  ...section.category,
                  name: newCategoryName.trim(),
                  description: newCategoryDescription.trim() || undefined,
                },
              }
            : section
        );
        setCategorySections(updatedSections);
      }

      setEditingCategory(null);
      setNewCategoryName("");
      setNewCategoryDescription("");
      setEditCategoryModalVisible(false);
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const success = await deleteCategory(categoryId);

      if (success) {
        // Update categories state
        setCategories(categories.filter((cat) => cat.id !== categoryId));

        // Update category sections
        setCategorySections(
          categorySections.filter(
            (section) => section.category.id !== categoryId
          )
        );
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  // Open edit category modal
  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryDescription(category.description || "");
    setEditCategoryModalVisible(true);
  };

  // Determinar qué categorías mostrar basado en los filtros
  const getVisibleCategories = () => {
    // Si hay categorías seleccionadas en los filtros, solo mostrar esas
    if (searchFilters?.categories.length) {
      return categorySections.filter((section) =>
        searchFilters.categories.includes(section.category.id)
      );
    }

    // Si hay búsqueda de texto o filtros de dificultad/tags, filtrar las categorías
    if (
      searchQuery.trim() ||
      (searchFilters &&
        (searchFilters.difficulties.length > 0 ||
          searchFilters.tags.length > 0))
    ) {
      return categorySections.filter((section) => {
        const query = searchQuery.toLowerCase().trim();

        // Si el nombre de la categoría coincide con la búsqueda, mostrarla
        if (query && section.category.name.toLowerCase().includes(query)) {
          return true;
        }

        // Si algún item coincide con los criterios, mostrar la categoría
        const hasMatchingItems = section.items.some((item) => {
          // Búsqueda de texto
          const matchesText = query
            ? item.title.toLowerCase().includes(query) ||
              (item.description &&
                item.description.toLowerCase().includes(query))
            : true;

          // Filtro de dificultad
          const matchesDifficulty = searchFilters?.difficulties.length
            ? item.difficulty &&
              searchFilters.difficulties.includes(String(item.difficulty))
            : true;

          // Filtro de etiquetas
          const matchesTags = searchFilters?.tags.length
            ? item.tags &&
              item.tags.some((tagId) => searchFilters.tags.includes(tagId))
            : true;

          return matchesText && matchesDifficulty && matchesTags;
        });

        return hasMatchingItems;
      });
    }

    // Si no hay filtros, mostrar todas las categorías
    return categorySections;
  };

  // Filter items within sections
  const getFilteredItems = (items: LibraryItem[]) => {
    // Si no hay búsqueda ni filtros, mostrar todos los items
    if (
      !searchQuery.trim() &&
      (!searchFilters ||
        (searchFilters.categories.length === 0 &&
          searchFilters.difficulties.length === 0 &&
          searchFilters.tags.length === 0))
    ) {
      return items;
    }

    return items.filter((item) => {
      // Búsqueda de texto
      const query = searchQuery.toLowerCase().trim();
      const matchesText = query
        ? item.title.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query))
        : true;

      // Filtro de dificultad
      const matchesDifficulty = searchFilters?.difficulties.length
        ? item.difficulty &&
          searchFilters.difficulties.includes(String(item.difficulty))
        : true;

      // Filtro de etiquetas
      const matchesTags = searchFilters?.tags.length
        ? item.tags &&
          item.tags.some((tagId) => searchFilters.tags.includes(tagId))
        : true;

      // Filtro de categoría
      const matchesCategory = searchFilters?.categories.length
        ? item.category_id &&
          searchFilters.categories.includes(item.category_id)
        : true;

      return matchesText && matchesDifficulty && matchesTags && matchesCategory;
    });
  };

  // Get icon based on item type
  const getItemIcon = (type: string) => {
    switch (type) {
      case "magic":
        return <FontAwesome5 name="magic" size={20} color="white" />;
      case "gimmick":
        return (
          <MaterialCommunityIcons name="toolbox" size={20} color="white" />
        );
      case "technique":
        return <Ionicons name="flash" size={20} color="white" />;
      case "script":
        return <FontAwesome name="file-text-o" size={20} color="white" />;
      default:
        return <FontAwesome5 name="magic" size={20} color="white" />;
    }
  };

  // Fetch complete item data based on type
  const fetchItemData = async (item: LibraryItem) => {
    try {
      if (item.type === "magic") {
        // Fetch trick data (existing code)
        const { data, error } = await supabase
          .from("magic_tricks")
          .select("*")
          .eq("id", item.id)
          .single();

        if (error) {
          console.error("Error fetching trick data:", error);
          return null;
        }

        // Parse angles if it's stored as a JSON string
        if (data.angles && typeof data.angles === "string") {
          try {
            data.angles = JSON.parse(data.angles);
          } catch (e) {
            data.angles = [];
          }
        } else if (!data.angles) {
          data.angles = [];
        }

        // Add default values for missing properties
        const trickData = {
          id: data.id,
          title: data.title,
          category: "Unknown",
          effect: data.effect || "",
          secret: data.secret || "",
          effect_video_url: data.effect_video_url,
          secret_video_url: data.secret_video_url,
          photo_url: data.photo_url,
          script: data.script || "",
          angles: data.angles,
          duration: data.duration || 0,
          reset: data.reset || 0,
          difficulty: data.difficulty ? Number.parseInt(data.difficulty) : 0,
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
      } else if (item.type === "technique") {
        // For techniques, show a different view or adapt the data
        const { data, error } = await supabase
          .from("techniques")
          .select("*")
          .eq("id", item.id)
          .single();

        if (error) {
          console.error("Error fetching technique data:", error);
          return null;
        }

        // Parse angles
        let angles = [];
        if (data.angles) {
          try {
            angles =
              typeof data.angles === "string"
                ? JSON.parse(data.angles)
                : data.angles;
          } catch {
            angles = [];
          }
        }

        // Adapt technique data to trick format for now
        const techniqueData = {
          id: data.id,
          title: data.name,
          category: "Technique",
          effect: data.description || "",
          secret: data.notes || "",
          effect_video_url: data.video_url,
          secret_video_url: null,
          photo_url: data.image_url,
          script: "",
          angles: angles,
          duration: 0,
          reset: 0,
          difficulty: data.difficulty || 0,
        };

        // Get category name
        const { data: categoryData } = await supabase
          .from("technique_categories")
          .select("category_id")
          .eq("technique_id", item.id)
          .limit(1);

        if (categoryData && categoryData.length > 0) {
          const categoryId = categoryData[0].category_id;

          const { data: category } = await supabase
            .from("user_categories")
            .select("name")
            .eq("id", categoryId)
            .single();

          if (category) {
            techniqueData.category = category.name;
          }
        }

        return techniqueData;
      } else if (item.type === "gimmick") {
        // For gimmicks, adapt the data
        const { data, error } = await supabase
          .from("gimmicks")
          .select("*")
          .eq("id", item.id)
          .single();

        if (error) {
          console.error("Error fetching gimmick data:", error);
          return null;
        }

        // Parse angles
        let angles = [];
        if (data.angles) {
          try {
            angles =
              typeof data.angles === "string"
                ? JSON.parse(data.angles)
                : data.angles;
          } catch {
            angles = [];
          }
        }

        // Adapt gimmick data to trick format
        const gimmickData = {
          id: data.id,
          title: data.name,
          category: "Gimmick",
          effect: data.description || "",
          secret: data.secret_description || data.notes || "",
          effect_video_url: data.video_url,
          secret_video_url: data.craft_video_url,
          photo_url: data.image_url,
          script: data.instructions || "",
          angles: angles,
          duration: 0,
          reset: data.reset_time || 0,
          difficulty: data.difficulty || 0,
        };

        // Get category name
        const { data: categoryData } = await supabase
          .from("gimmick_categories")
          .select("category_id")
          .eq("gimmick_id", item.id)
          .limit(1);

        if (categoryData && categoryData.length > 0) {
          const categoryId = categoryData[0].category_id;

          const { data: category } = await supabase
            .from("user_categories")
            .select("name")
            .eq("id", categoryId)
            .single();

          if (category) {
            gimmickData.category = category.name;
          }
        }

        return gimmickData;
      }

      return null;
    } catch (error) {
      console.error("Error in fetchItemData:", error);
      return null;
    }
  };

  // Render category item
  const renderCategoryItem = ({ item }: { item: CategorySection }) => {
    const filteredItems = getFilteredItems(item.items);

    return (
      <StyledView className="mb-4">
        <StyledView className="flex-row justify-between items-center bg-white/10 p-3 rounded-lg mb-2">
          <StyledText className="text-white font-bold">
            {item.category.name}
          </StyledText>
          <StyledView className="flex-row items-center">
            <StyledText className="text-white mr-2">
              {filteredItems.length}
            </StyledText>
            <StyledView className="flex-row">
              <StyledTouchableOpacity
                onPress={() => openEditCategoryModal(item.category)}
                className="p-2"
              >
                <MaterialIcons name="edit" size={16} color="white" />
              </StyledTouchableOpacity>
              <StyledTouchableOpacity
                onPress={() => handleDeleteCategory(item.category.id)}
                className="p-2"
              >
                <Feather name="trash-2" size={16} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledView>

        {filteredItems.length > 0 ? (
          filteredItems.map((libraryItem) => (
            <StyledTouchableOpacity
              key={`${libraryItem.type}-${libraryItem.id}`}
              className="flex-row justify-between items-center bg-white/5 p-3 rounded-lg mb-1"
              onPress={async () => {
                const itemData = await fetchItemData(libraryItem);
                if (itemData) {
                  setSelectedTrickData(itemData);
                }
              }}
            >
              <StyledView className="flex-row items-center flex-1">
                {getItemIcon(libraryItem.type)}
                <StyledText
                  className="text-white ml-2 flex-1"
                  numberOfLines={1}
                >
                  {libraryItem.title}
                </StyledText>
                {/* Mostrar tipo de contenido */}
                <StyledText className="text-white/50 text-xs ml-2">
                  {libraryItem.type === "magic"
                    ? t("trick")
                    : libraryItem.type === "technique"
                    ? t("technique")
                    : libraryItem.type === "gimmick"
                    ? t("gimmick")
                    : t("script")}
                </StyledText>
              </StyledView>
            </StyledTouchableOpacity>
          ))
        ) : (
          <StyledView className="bg-white/5 p-3 rounded-lg">
            <StyledText className="text-white/50 text-center">
              {t("noItems", "No items in this category")}
            </StyledText>
          </StyledView>
        )}
      </StyledView>
    );
  };

  // Obtener las categorías visibles según los filtros
  const visibleCategories = getVisibleCategories();

  // Render libraries section
  return (
    <StyledView className="flex-1">
      {/* Libraries Header */}
      <StyledView className="flex-row justify-between items-center mb-4">
        <StyledView className="flex-row items-center">
          <FontAwesome name="book" size={24} color="white" />
          <StyledText className="text-white text-xl ml-2">
            {t("librariesCount", { count: categories.length })}
          </StyledText>
        </StyledView>

        <StyledTouchableOpacity
          className="bg-white/20 p-2 rounded-full"
          onPress={() => setAddCategoryModalVisible(true)}
        >
          <AntDesign name="plus" size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>

      {/* Loading indicator */}
      {loading ? (
        <StyledView className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
        </StyledView>
      ) : (
        /* Category Sections with bottom padding for navigation bar */
        <FlatList
          data={visibleCategories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.category.id}
          scrollEnabled={true}
          contentContainerStyle={{
            paddingBottom: NAVBAR_HEIGHT + BOTTOM_SPACING,
          }}
          ListEmptyComponent={
            <StyledView className="bg-white/5 p-6 rounded-lg items-center">
              <StyledText className="text-white/50 text-center text-lg mb-2">
                {searchQuery.trim() ||
                (searchFilters &&
                  (searchFilters.categories.length > 0 ||
                    searchFilters.difficulties.length > 0 ||
                    searchFilters.tags.length > 0))
                  ? t("noSearchResults", "No results found")
                  : t("noCategories", "No categories found")}
              </StyledText>
              {!searchQuery.trim() &&
                (!searchFilters ||
                  (searchFilters.categories.length === 0 &&
                    searchFilters.difficulties.length === 0 &&
                    searchFilters.tags.length === 0)) && (
                  <StyledTouchableOpacity
                    className="bg-emerald-700 px-4 py-2 rounded-lg mt-2"
                    onPress={() => setAddCategoryModalVisible(true)}
                  >
                    <StyledText className="text-white">
                      {t("addCategory")}
                    </StyledText>
                  </StyledTouchableOpacity>
                )}
            </StyledView>
          }
        />
      )}

      {/* Add Category Modal */}
      <Modal
        visible={isAddCategoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddCategoryModalVisible(false)}
      >
        <StyledView className="flex-1 justify-center items-center bg-black/50">
          <StyledView className="bg-gray-800 p-6 rounded-xl w-4/5">
            <StyledText className="text-white text-xl font-bold mb-4">
              {t("addCategory")}
            </StyledText>

            <StyledView className="bg-gray-700 rounded-lg mb-4">
              <BlurView intensity={20} tint="dark">
                <StyledTextInput
                  className="text-white p-3"
                  placeholder={t("categoryName")}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
              </BlurView>
            </StyledView>

            <StyledView className="bg-gray-700 rounded-lg mb-4">
              <BlurView intensity={20} tint="dark">
                <StyledTextInput
                  className="text-white p-3"
                  placeholder={t("description", "Description (optional)")}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={newCategoryDescription}
                  onChangeText={setNewCategoryDescription}
                  multiline
                  numberOfLines={3}
                />
              </BlurView>
            </StyledView>

            <StyledView className="flex-row justify-end">
              <StyledTouchableOpacity
                className="bg-gray-600 px-4 py-2 rounded-lg mr-2"
                onPress={() => {
                  setNewCategoryName("");
                  setNewCategoryDescription("");
                  setAddCategoryModalVisible(false);
                }}
              >
                <StyledText className="text-white">{t("cancel")}</StyledText>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                className="bg-emerald-700 px-4 py-2 rounded-lg"
                onPress={handleAddCategory}
                disabled={!newCategoryName.trim()}
              >
                <StyledText className="text-white">{t("add")}</StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledView>
      </Modal>
      {/* Edit Category Modal */}
      <Modal
        visible={isEditCategoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditCategoryModalVisible(false)}
      >
        <StyledView className="flex-1 justify-center items-center bg-black/50">
          <StyledView className="bg-gray-800 p-6 rounded-xl w-4/5">
            <StyledText className="text-white text-xl font-bold mb-4">
              {t("editCategory", "Edit Category")}
            </StyledText>

            <StyledView className="bg-gray-700 rounded-lg mb-4">
              <BlurView intensity={20} tint="dark">
                <StyledTextInput
                  className="text-white p-3"
                  placeholder={t("categoryName")}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
              </BlurView>
            </StyledView>

            <StyledView className="bg-gray-700 rounded-lg mb-4">
              <BlurView intensity={20} tint="dark">
                <StyledTextInput
                  className="text-white p-3"
                  placeholder={t("description", "Description (optional)")}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={newCategoryDescription}
                  onChangeText={setNewCategoryDescription}
                  multiline
                  numberOfLines={3}
                />
              </BlurView>
            </StyledView>

            <StyledView className="flex-row justify-end">
              <StyledTouchableOpacity
                className="bg-gray-600 px-4 py-2 rounded-lg mr-2"
                onPress={() => {
                  setEditingCategory(null);
                  setNewCategoryName("");
                  setNewCategoryDescription("");
                  setEditCategoryModalVisible(false);
                }}
              >
                <StyledText className="text-white">{t("cancel")}</StyledText>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                className="bg-emerald-700 px-4 py-2 rounded-lg"
                onPress={handleEditCategory}
                disabled={!newCategoryName.trim()}
              >
                <StyledText className="text-white">
                  {t("save", "Save")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledView>
      </Modal>

      {/* Trick View Modal */}
      {selectedTrickData && (
        <Modal
          visible={!!selectedTrickData}
          transparent={false}
          animationType="slide"
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
    </StyledView>
  );
}
