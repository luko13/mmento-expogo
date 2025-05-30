"use client";

import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
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
  Animated,
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
  Entypo,
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
  getAllUserContent,
} from "../../utils/categoryService";
import TrickViewScreen from "../TrickViewScreen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { SearchFilters } from "./CompactSearchBar";
import { EncryptedContentService } from "../../services/encryptedContentService";
import { useEncryption } from "../../hooks/useEncryption";
import { FileEncryptionService } from "../../utils/fileEncryption";
import * as FileSystem from "expo-file-system";
import { getTrickWithEncryptedPhotos } from "../../utils/trickHelpers";
import DeleteModal from "../ui/DeleteModal";
import CantDeleteModal from "../ui/CantDeleteModal";
import CategoryActionsModal from "../ui/CategoryActionsModal";
import CategoryModal from "../ui/CategoryModal";
import { useRouter } from "expo-router";

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
  difficulty?: number | null;
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
  // Campos de cifrado
  is_encrypted?: boolean;
  is_shared?: boolean;
  owner_id?: string;
  decryption_error?: boolean;
}

interface CategorySection {
  category: Category;
  items: LibraryItem[];
}

interface LibrariesSectionProps {
  searchQuery?: string;
  searchFilters?: SearchFilters;
}

// Funcion para obtener el icono del item
const getItemIcon = (type: string) => {
  switch (type) {
    case "magic":
      return (
        <FontAwesome
          name="magic"
          size={20}
          color="white"
          style={{ transform: [{ scaleX: -1 }] }}
        />
      );
    case "gimmick":
      return <Feather name="box" size={20} color="white" />;
    case "technique":
      return <MaterialIcons name="animation" size={20} color="white" />;
    case "script":
      return <FontAwesome name="file-text-o" size={20} color="white" />;
    default:
      return (
        <FontAwesome
          name="magic"
          size={20}
          color="white"
          style={{ transform: [{ scaleX: -1 }] }}
        />
      );
  }
};

// Componente memoizado para la fila de los item de la biblioteca (Trucos de magia, técnicas y gimmicks)
const LibraryItemRow = memo(
  ({
    item,
    onPress,
  }: {
    item: LibraryItem;
    onPress: (item: LibraryItem) => void;
  }) => {
    const { t } = useTranslation();

    return (
      <StyledTouchableOpacity
        className="flex-row justify-between items-center p-3 rounded-lg mb-1 border-b border-white/10"
        onPress={() => onPress(item)}
      >
        <StyledView className="flex-row items-center flex-1">
          {getItemIcon(item.type)}
          <StyledText className="text-white ml-2 flex-1" numberOfLines={1}>
            {item.title}
          </StyledText>
          <StyledView className="flex-row items-center">
            {item.is_shared && (
              <Feather
                name="users"
                size={14}
                color="#3b82f6"
                style={{ marginRight: 8 }}
              />
            )}
            {item.decryption_error && (
              <Ionicons
                name="warning"
                size={14}
                color="#ef4444"
                style={{ marginRight: 8 }}
              />
            )}
          </StyledView>
        </StyledView>
      </StyledTouchableOpacity>
    );
  }
);

// Componente para manejar la animación de colapso/expansión
const CollapsibleCategory = memo(
  ({
    section,
    onItemPress,
    onEditCategory,
    onDeleteCategory,
    onMoreOptions,
    searchQuery,
    searchFilters,
    t,
  }: {
    section: CategorySection;
    onItemPress: (item: LibraryItem) => void;
    onEditCategory: (category: Category) => void;
    onDeleteCategory: (categoryId: string) => void;
    onMoreOptions: (category: Category) => void;
    searchQuery: string;
    searchFilters?: SearchFilters;
    t: any;
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const animatedHeight = useRef(new Animated.Value(0)).current;
    const animatedRotation = useRef(new Animated.Value(0)).current;

    const toggleExpanded = () => {
      const toValue = isExpanded ? 0 : 1;

      Animated.parallel([
        Animated.timing(animatedHeight, {
          toValue,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(animatedRotation, {
          toValue,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      setIsExpanded(!isExpanded);
    };

    const filteredItems = section.items.filter((libraryItem) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesText = query
        ? libraryItem.title.toLowerCase().includes(query) ||
          (libraryItem.description &&
            libraryItem.description.toLowerCase().includes(query))
        : true;

      const matchesDifficulty = searchFilters?.difficulties.length
        ? libraryItem.difficulty &&
          searchFilters.difficulties.includes(String(libraryItem.difficulty))
        : true;

      const matchesTags = searchFilters?.tags.length
        ? libraryItem.tags &&
          libraryItem.tags.some((tagId) => searchFilters.tags.includes(tagId))
        : true;

      return matchesText && matchesDifficulty && matchesTags;
    });

    const rotateInterpolation = animatedRotation.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "90deg"],
    });

    return (
      <StyledView className="mb-4">
        <StyledTouchableOpacity
          className="flex-row justify-between items-center bg-white/10 px-3 border border-white/20 rounded-lg mb-2"
          onPress={toggleExpanded}
          activeOpacity={0.7}
        >
          <StyledView className="flex-row items-center flex-1">
            <Animated.View
              style={{ transform: [{ rotate: rotateInterpolation }] }}
            >
              <MaterialIcons name="chevron-right" size={20} color="white" />
            </Animated.View>
            <StyledText className="text-white font-bold ml-2">
              {section.category.name}
            </StyledText>
          </StyledView>
          <StyledView className="flex-row items-center">
            <StyledText className="text-white mr-2">
              {filteredItems.length}
            </StyledText>
            <StyledTouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onMoreOptions(section.category);
              }}
              className="p-2"
            >
              <Entypo name="dots-three-horizontal" size={16} color="white" />
            </StyledTouchableOpacity>
          </StyledView>
        </StyledTouchableOpacity>

        <Animated.View
          style={{
            maxHeight: animatedHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1000], // Ajusta este valor según sea necesario
            }),
            opacity: animatedHeight,
            overflow: "hidden",
          }}
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((libraryItem) => (
              <LibraryItemRow
                key={`${libraryItem.type}-${libraryItem.id}`}
                item={libraryItem}
                onPress={onItemPress}
              />
            ))
          ) : (
            <StyledView className="border-b border-white/20 p-3 rounded-lg">
              <StyledText className="text-white/50 text-center">
                {t("noItems", "No items in this category")}
              </StyledText>
            </StyledView>
          )}
        </Animated.View>
      </StyledView>
    );
  }
);

export default function LibrariesSection({
  searchQuery = "",
  searchFilters,
}: LibrariesSectionProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isAddCategoryModalVisible, setAddCategoryModalVisible] =
    useState(false);
  const [isEditCategoryModalVisible, setEditCategoryModalVisible] =
    useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrickData, setSelectedTrickData] = useState<any>(null);
  const [allContent, setAllContent] = useState<any>(null);
  const [decryptingFiles, setDecryptingFiles] = useState<Set<string>>(
    new Set()
  );
  const [showKeyRefreshBanner, setShowKeyRefreshBanner] = useState(false);

  const { decryptForSelf, keyPair, getPublicKey, refreshKeys } = useEncryption();
  const encryptedService = new EncryptedContentService();
  const fileEncryptionService = new FileEncryptionService();
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

  // Helper function to handle encrypted files
  const handleEncryptedFile = async (
    fileId: string,
    fileName: string,
    mimeType: string,
    userId: string
  ): Promise<string | null> => {
    try {
      setDecryptingFiles((prev) => new Set(prev).add(fileId));

      const result = await fileEncryptionService.downloadAndDecryptFile(
        fileId,
        userId,
        getPublicKey,
        () => keyPair!.privateKey
      );

      // Convertir Uint8Array a base64 sin usar Buffer
      let binaryString = "";
      const chunkSize = 8192;
      for (let i = 0; i < result.data.length; i += chunkSize) {
        const chunk = result.data.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Data = btoa(binaryString);

      // Guardar temporalmente el archivo descifrado
      const tempUri = `${FileSystem.cacheDirectory}${fileId}_${fileName}`;
      await FileSystem.writeAsStringAsync(tempUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setDecryptingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });

      return tempUri;
    } catch (error) {
      console.error("Error descargando archivo cifrado:", error);
      setDecryptingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
      return null;
    }
  };

  // Function to decrypt content in batches with error recovery
  const decryptContentBatch = async (content: any, userId: string) => {
    if (!keyPair || !decryptForSelf) return;

    const decryptPromises = [];
    let decryptionErrors = 0;

    // Helper function to safely decrypt content
    const safeDecrypt = async (
      item: any,
      contentType:  'magic_tricks' | 'techniques' | 'gimmicks',
      isShared: boolean = false
    ) => {
      try {
        let decrypted;
        
        if (isShared) {
          decrypted = await encryptedService.getSharedContent(
            item.id,
            contentType,
            userId,
            decryptForSelf
          );
        } else {
          decrypted = await encryptedService.getOwnContent(
            item.id,
            contentType,
            decryptForSelf,
            () => keyPair.privateKey
          );
        }
        
        if (decrypted) {
          Object.assign(item, decrypted);
          item.decryption_error = false;
        }
      } catch (err) {
        decryptionErrors++;
        console.error(`Error decrypting ${contentType} ${item.id}:`, err);
        
        // Mark item as having decryption error
        item.decryption_error = true;
        item.title = item.title || `[Encrypted ${contentType}]`;
        item.name = item.name || `[Encrypted ${contentType}]`;
      }
    };

    // Decrypt tricks
    content.tricks.forEach((trick: any) => {
      if (trick.is_encrypted) {
        decryptPromises.push(safeDecrypt(trick, 'magic_tricks'));
      }
    });

    // Decrypt techniques
    content.techniques.forEach((technique: any) => {
      if (technique.is_encrypted) {
        decryptPromises.push(safeDecrypt(technique, 'techniques'));
      }
    });

    // Decrypt gimmicks
    content.gimmicks.forEach((gimmick: any) => {
      if (gimmick.is_encrypted) {
        decryptPromises.push(safeDecrypt(gimmick, 'gimmicks'));
      }
    });

    // Decrypt shared content
    for (const shared of content.sharedContent) {
      let contentTable;
      switch (shared.content_type) {
        case "magic_tricks":
          contentTable = content.tricks;
          break;
        case "techniques":
          contentTable = content.techniques;
          break;
        case "gimmicks":
          contentTable = content.gimmicks;
          break;
        default:
          continue;
      }

      const originalContent = contentTable?.find(
        (item: any) => item.id === shared.content_id
      );
      
      if (originalContent && originalContent.is_encrypted) {
        decryptPromises.push(
          safeDecrypt(originalContent, shared.content_type, true)
        );
      }
    }

    // Execute all decrypt promises
    await Promise.all(decryptPromises);

    // If too many errors, likely wrong key - prompt user
    if (decryptionErrors > 5) {
      console.warn(`⚠️ Multiple decryption failures (${decryptionErrors}). Keys may be outdated.`);
      setShowKeyRefreshBanner(true);
    }

    // Force re-render
    setAllContent({ ...content });
  };

  // Load all data at once
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Test queries to check if data exists
        const { data: techTest } = await supabase
          .from("techniques")
          .select("count")
          .eq("user_id", user.id);

        const { data: gimmickTest } = await supabase
          .from("gimmicks")
          .select("count")
          .eq("user_id", user.id);
        await ensureDefaultCategories(user.id);
        const content = await getAllUserContent(user.id);
        setAllContent(content);

        // Decrypt content in batches if keyPair available
        if (keyPair) {
          await decryptContentBatch(content, user.id);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [keyPair]);

  // Process and filter data with memoization
  const categorySections = useMemo(() => {
    if (!allContent) return [];

    const sections: CategorySection[] = allContent.categories.map(
      (category: Category) => {
        const categoryItems: LibraryItem[] = [];

        // Process tricks
        allContent.tricks.forEach((trick: any) => {
          // Check if trick belongs to this category
          const belongsToCategory =
            trick.trick_categories &&
            Array.isArray(trick.trick_categories) &&
            trick.trick_categories.some(
              (tc: any) => tc.category_id === category.id
            );

          if (belongsToCategory) {
            categoryItems.push({
              id: trick.id,
              title: trick.title,
              type: "magic" as const,
              difficulty: trick.difficulty,
              status: trick.status,
              created_at: trick.created_at,
              duration: trick.duration,
              category_id: category.id,
              tags: trick.trick_tags?.map((tt: any) => tt.tag_id) || [],
              reset: trick.reset,
              notes: trick.notes,
              is_encrypted: trick.is_encrypted,
              owner_id: trick.user_id,
              decryption_error: trick.decryption_error,
            });
          }
        });

        // Process techniques
        allContent.techniques.forEach((technique: any) => {
          // Check if technique belongs to this category
          const belongsToCategory =
            technique.technique_categories &&
            Array.isArray(technique.technique_categories) &&
            technique.technique_categories.some(
              (tc: any) => tc.category_id === category.id
            );

          if (belongsToCategory) {
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

            categoryItems.push({
              id: technique.id,
              title: technique.name,
              type: "technique" as const,
              difficulty: technique.difficulty,
              status: technique.status,
              created_at: technique.created_at,
              category_id: category.id,
              tags: technique.technique_tags?.map((tt: any) => tt.tag_id) || [],
              description: technique.description,
              notes: technique.notes,
              angles: angles,
              special_materials: technique.special_materials,
              is_encrypted: technique.is_encrypted,
              owner_id: technique.user_id,
              decryption_error: technique.decryption_error,
            });
          }
        });

        // Process gimmicks
        allContent.gimmicks.forEach((gimmick: any) => {
          // Comprobar si "Gimmicks" pertenece a esta categoria
          const belongsToCategory =
            gimmick.gimmick_categories &&
            Array.isArray(gimmick.gimmick_categories) &&
            gimmick.gimmick_categories.some(
              (gc: any) => gc.category_id === category.id
            );

          if (belongsToCategory) {
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

            categoryItems.push({
              id: gimmick.id,
              title: gimmick.name,
              type: "gimmick" as const,
              difficulty: gimmick.difficulty,
              status: gimmick.status,
              created_at: gimmick.created_at,
              category_id: category.id,
              tags: [],
              description: gimmick.description,
              notes: gimmick.notes,
              angles: angles,
              special_materials: gimmick.special_materials,
              reset: gimmick.reset_time,
              is_encrypted: gimmick.is_encrypted,
              owner_id: gimmick.user_id,
              decryption_error: gimmick.decryption_error,
            });
          }
        });

        // Procesar contenido compartido
        allContent.sharedContent.forEach((shared: any) => {
          const isThisCategory = (itemId: string, itemType: string) => {
            switch (itemType) {
              case "magic_tricks":
                const trick = allContent.tricks.find(
                  (t: any) => t.id === itemId
                );
                return (
                  trick &&
                  trick.trick_categories &&
                  Array.isArray(trick.trick_categories) &&
                  trick.trick_categories.some(
                    (tc: any) => tc.category_id === category.id
                  )
                );
              case "techniques":
                const technique = allContent.techniques.find(
                  (t: any) => t.id === itemId
                );
                return (
                  technique &&
                  technique.technique_categories &&
                  Array.isArray(technique.technique_categories) &&
                  technique.technique_categories.some(
                    (tc: any) => tc.category_id === category.id
                  )
                );
              case "gimmicks":
                const gimmick = allContent.gimmicks.find(
                  (g: any) => g.id === itemId
                );
                return (
                  gimmick &&
                  gimmick.gimmick_categories &&
                  Array.isArray(gimmick.gimmick_categories) &&
                  gimmick.gimmick_categories.some(
                    (gc: any) => gc.category_id === category.id
                  )
                );
              default:
                return false;
            }
          };

          if (isThisCategory(shared.content_id, shared.content_type)) {
            let originalContent;
            let itemType: LibraryItem["type"];

            switch (shared.content_type) {
              case "magic_tricks":
                originalContent = allContent.tricks.find(
                  (t: any) => t.id === shared.content_id
                );
                itemType = "magic";
                break;
              case "techniques":
                originalContent = allContent.techniques.find(
                  (t: any) => t.id === shared.content_id
                );
                itemType = "technique";
                break;
              case "gimmicks":
                originalContent = allContent.gimmicks.find(
                  (g: any) => g.id === shared.content_id
                );
                itemType = "gimmick";
                break;
            }

            if (originalContent) {
              categoryItems.push({
                id: originalContent.id,
                title:
                  shared.content_type === "magic_tricks"
                    ? originalContent.title
                    : originalContent.name,
                type: itemType!,
                difficulty: originalContent.difficulty,
                status: originalContent.status,
                created_at: originalContent.created_at,
                category_id: category.id,
                tags: [],
                is_encrypted: originalContent.is_encrypted,
                is_shared: true,
                owner_id: shared.owner_id,
                decryption_error: originalContent.decryption_error,
              });
            }
          }
        });

        return { category, items: categoryItems };
      }
    );
    return sections;
  }, [allContent]);

  // Filtrar categorias visibles con memorización
  const visibleCategories = useMemo(() => {
    if (!searchQuery && !searchFilters) return categorySections;

    // Si hay seleccionadas categorías, filtrar las categorias
    if (searchFilters?.categories.length) {
      return categorySections.filter((section) =>
        searchFilters.categories.includes(section.category.id)
      );
    }

    // Si hay filtros de busqueda, filtrar las categorias
    return categorySections;
  }, [categorySections, searchQuery, searchFilters]);

  // Añadir nueva categoria
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const newCategory = await createCategory(user.id, newCategoryName.trim());

      if (newCategory) {
        setAllContent({
          ...allContent,
          categories: [...allContent.categories, newCategory],
        });
      }

      setNewCategoryName("");
      setAddCategoryModalVisible(false);
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  // Editar categoria
  const handleEditCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return;

    try {
      const success = await updateCategory(
        editingCategory.id,
        newCategoryName.trim()
      );

      if (success) {
        setAllContent({
          ...allContent,
          categories: allContent.categories.map((cat: Category) =>
            cat.id === editingCategory.id
              ? {
                  ...cat,
                  name: newCategoryName.trim(),
                }
              : cat
          ),
        });
      }

      setEditingCategory(null);
      setNewCategoryName("");
      setEditCategoryModalVisible(false);
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  // Borrar categoria
  const handleDeleteCategory = async (categoryId: string) => {
    const category = allContent?.categories.find(
      (cat: Category) => cat.id === categoryId
    );

    if (category) {
      // Verificar si la categoría tiene items
      const categorySection = categorySections.find(
        (section) => section.category.id === categoryId
      );

      const itemCount = categorySection?.items.length || 0;

      if (itemCount > 0) {
        // La categoría no está vacía, mostrar modal informativo
        setCategoryToDelete({ id: category.id, name: category.name });
        setCategoryItemCount(itemCount);
        setShowCantDeleteModal(true);
        return;
      }

      // La categoría está vacía, proceder con la confirmación de borrado
      setCategoryToDelete({ id: category.id, name: category.name });
      setShowDeleteModal(true);
    }
  };

  // Funcion de confirmacion de borrado de categoría
  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const success = await deleteCategory(categoryToDelete.id);

      if (success) {
        setAllContent({
          ...allContent,
          categories: allContent.categories.filter(
            (cat: Category) => cat.id !== categoryToDelete.id
          ),
        });
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    } finally {
      setShowDeleteModal(false);
      setCategoryToDelete(null);
    }
  };

  // Open edit category modal
  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setEditCategoryModalVisible(true);
  };

  // Recuperacion de los datos dependiendo del tipo de item
  const fetchItemData = async (item: LibraryItem) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      if (item.type === "magic") {
        // Usar la función helper en lugar de la consulta directa
        const data = await getTrickWithEncryptedPhotos(item.id);

        if (!data) {
          console.error("Error fetching trick data");
          return null;
        }

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

          // Manejo de archivos cifrados
          if (decryptedData.photo_encrypted && decryptedData.photo_url) {
            const photoUrl = await handleEncryptedFile(
              decryptedData.photo_url,
              "photo.jpg",
              "image/jpeg",
              user.id
            );
            if (photoUrl) decryptedData.photo_url = photoUrl;
          }

          if (
            decryptedData.effect_video_encrypted &&
            decryptedData.effect_video_url
          ) {
            const videoUrl = await handleEncryptedFile(
              decryptedData.effect_video_url,
              "effect_video.mp4",
              "video/mp4",
              user.id
            );
            if (videoUrl) decryptedData.effect_video_url = videoUrl;
          }

          if (
            decryptedData.secret_video_encrypted &&
            decryptedData.secret_video_url
          ) {
            const videoUrl = await handleEncryptedFile(
              decryptedData.secret_video_url,
              "secret_video.mp4",
              "video/mp4",
              user.id
            );
            if (videoUrl) decryptedData.secret_video_url = videoUrl;
          }
        }

        // Conversion de angulos (Solo si es necesario )
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
          photos: decryptedData.photos || [], // AGREGAR ESTA LÍNEA
          script: decryptedData.script || "",
          angles: decryptedData.angles,
          duration: decryptedData.duration || 0,
          reset: decryptedData.reset || 0,
          difficulty: decryptedData.difficulty
            ? Number.parseInt(decryptedData.difficulty)
            : 0,
          is_encrypted: data.is_encrypted,
          is_shared: item.is_shared,
          owner_info: item.is_shared ? item.owner_id : null,
        };

        // Nombre de la categoria
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
        const { data, error } = await supabase
          .from("techniques")
          .select("*")
          .eq("id", item.id)
          .single();

        if (error) {
          console.error("Error fetching technique data:", error);
          return null;
        }

        let decryptedData = data;
        if (data.is_encrypted && decryptForSelf && keyPair) {
          if (item.is_shared) {
            const decrypted = await encryptedService.getSharedContent(
              data.id,
              "techniques",
              user.id,
              decryptForSelf
            );
            if (decrypted) {
              decryptedData = decrypted as any;
            }
          } else {
            const decrypted = await encryptedService.getOwnContent(
              data.id,
              "techniques",
              decryptForSelf,
              () => keyPair.privateKey
            );
            if (decrypted) {
              decryptedData = decrypted as any;
            }
          }

          // Manejo de archivos cifrados
          if (decryptedData.image_encrypted && decryptedData.image_url) {
            const imageUrl = await handleEncryptedFile(
              decryptedData.image_url,
              "image.jpg",
              "image/jpeg",
              user.id
            );
            if (imageUrl) decryptedData.image_url = imageUrl;
          }

          if (decryptedData.video_encrypted && decryptedData.video_url) {
            const videoUrl = await handleEncryptedFile(
              decryptedData.video_url,
              "video.mp4",
              "video/mp4",
              user.id
            );
            if (videoUrl) decryptedData.video_url = videoUrl;
          }
        }

        // Manejo de angulos
        let angles = [];
        if (decryptedData.angles) {
          try {
            angles =
              typeof decryptedData.angles === "string"
                ? JSON.parse(decryptedData.angles)
                : decryptedData.angles;
          } catch {
            angles = [];
          }
        }

        const techniqueData = {
          id: decryptedData.id,
          title: decryptedData.name,
          category: "Technique",
          effect: decryptedData.description || "",
          secret: decryptedData.notes || "",
          effect_video_url: decryptedData.video_url,
          secret_video_url: null,
          photo_url: decryptedData.image_url,
          script: "",
          angles: angles,
          duration: 0,
          reset: 0,
          difficulty: decryptedData.difficulty || 0,
          is_encrypted: data.is_encrypted,
          is_shared: item.is_shared,
        };

        // Nombre de la categoría
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
        const { data, error } = await supabase
          .from("gimmicks")
          .select("*")
          .eq("id", item.id)
          .single();

        if (error) {
          console.error("Error fetching gimmick data:", error);
          return null;
        }

        let decryptedData = data;
        if (data.is_encrypted && decryptForSelf && keyPair) {
          if (item.is_shared) {
            const decrypted = await encryptedService.getSharedContent(
              data.id,
              "gimmicks",
              user.id,
              decryptForSelf
            );
            if (decrypted) {
              decryptedData = decrypted as any;
            }
          } else {
            const decrypted = await encryptedService.getOwnContent(
              data.id,
              "gimmicks",
              decryptForSelf,
              () => keyPair.privateKey
            );
            if (decrypted) {
              decryptedData = decrypted as any;
            }
          }

          // Manejo de archivos cifrados
          if (decryptedData.image_encrypted && decryptedData.image_url) {
            const imageUrl = await handleEncryptedFile(
              decryptedData.image_url,
              "image.jpg",
              "image/jpeg",
              user.id
            );
            if (imageUrl) decryptedData.image_url = imageUrl;
          }

          if (decryptedData.video_encrypted && decryptedData.video_url) {
            const videoUrl = await handleEncryptedFile(
              decryptedData.video_url,
              "video.mp4",
              "video/mp4",
              user.id
            );
            if (videoUrl) decryptedData.video_url = videoUrl;
          }

          if (
            decryptedData.craft_video_encrypted &&
            decryptedData.craft_video_url
          ) {
            const videoUrl = await handleEncryptedFile(
              decryptedData.craft_video_url,
              "craft_video.mp4",
              "video/mp4",
              user.id
            );
            if (videoUrl) decryptedData.craft_video_url = videoUrl;
          }
        }

        // Convertir angulos
        let angles = [];
        if (decryptedData.angles) {
          try {
            angles =
              typeof decryptedData.angles === "string"
                ? JSON.parse(decryptedData.angles)
                : decryptedData.angles;
          } catch {
            angles = [];
          }
        }

        const gimmickData = {
          id: decryptedData.id,
          title: decryptedData.name,
          category: "Gimmick",
          effect: decryptedData.description || "",
          secret: decryptedData.secret_description || decryptedData.notes || "",
          effect_video_url: decryptedData.video_url,
          secret_video_url: decryptedData.craft_video_url,
          photo_url: decryptedData.image_url,
          script: decryptedData.instructions || "",
          angles: angles,
          duration: 0,
          reset: decryptedData.reset_time || 0,
          difficulty: decryptedData.difficulty || 0,
          is_encrypted: data.is_encrypted,
          is_shared: item.is_shared,
        };

        // Nombre de la categoría
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
  //Modal de opciones
  const handleMoreOptions = (category: Category) => {
    setSelectedCategoryForActions(category);
    setShowActionsModal(true);
  };
  // Optimizacion del callback al pulsar un item
  const handleItemPress = useCallback(
    async (item: LibraryItem) => {
      // Check if item has decryption error
      if (item.decryption_error) {
        // Show alert or modal asking user to refresh keys
        setShowKeyRefreshBanner(true);
        return;
      }

      const itemData = await fetchItemData(item);
      if (itemData) {
        // Navegar a la ruta dinámica con los datos serializados
        router.push({
          pathname: "/trick/[id]",
          params: {
            id: itemData.id,
            trick: JSON.stringify(itemData),
          },
        });
      }
    },
    [decryptForSelf, keyPair, router]
  );

  // Renderizado de categoria con memoria
  const renderCategoryItem = useCallback(
    ({ item }: { item: CategorySection }) => {
      return (
        <CollapsibleCategory
          section={item}
          onItemPress={handleItemPress}
          onEditCategory={openEditCategoryModal}
          onDeleteCategory={handleDeleteCategory}
          onMoreOptions={handleMoreOptions}
          searchQuery={searchQuery}
          searchFilters={searchFilters}
          t={t}
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
      t,
    ]
  );

  // Renderizado final
  return (
    <StyledView className="flex-1">
      {/* Key Refresh Banner */}
      {showKeyRefreshBanner && (
        <StyledView className="bg-red-500/20 border border-red-500/50 p-3 rounded-lg mb-3">
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

      {/* Header de libraries */}
      <StyledView className="flex-row justify-between items-center mb-2">
        <StyledView className="flex-row items-center">
          <Feather name="book" size={24} color="white" />
          <StyledText className="text-white text-xl ml-2">
            {t("librariesCount", { count: allContent?.categories.length || 0 })}
          </StyledText>
        </StyledView>

        <StyledTouchableOpacity
          className="p-2"
          onPress={() => setAddCategoryModalVisible(true)}
        >
          <AntDesign name="plus" size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>

      {/* Indicador de carga */}
      {loading ? (
        <StyledView className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
        </StyledView>
      ) : (
        /* Secciones de categorías optimizadas con FlatList */
        <FlatList
          data={visibleCategories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.category.id}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: NAVBAR_HEIGHT + BOTTOM_SPACING,
          }}
          // Optimizaciones de flatlist
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={5}
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
      {/* Category Modal for Add/Edit */}
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

      {/* Trick View Modal */}
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
      {/* Category Actions Modal */}
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
        }}
        onDelete={() => {
          if (selectedCategoryForActions) {
            handleDeleteCategory(selectedCategoryForActions.id);
          }
        }}
        categoryName={selectedCategoryForActions?.name}
      />
      {/* Delete Category Modal */}
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
      {/* Category Not Empty Modal */}
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
}