// components/home/CollapsibleCategoryOptimized.tsx
import React, { memo, useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { MaterialIcons, Entypo } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { fontNames } from "../../app/_layout";
import InlineProgressBar from "./TrickCompletionProgress";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface LibraryItem {
  id: string;
  title: string;
  type: "magic" | "gimmick" | "technique" | "script";
  difficulty?: number | null;
  is_shared?: boolean;
  tags?: string[];
  description?: string;
  is_favorite?: boolean;
  is_public?: boolean;
  category_id?: string;
  effect_video_url?: string;
  effect?: string;
  secret_video_url?: string;
  secret?: string;
  angles?: string[] | any;
  duration?: number | null;
  reset?: number | null;
  notes?: string;
}

interface CategorySection {
  category: any;
  items: LibraryItem[];
}

// Define SearchFilters interface locally to match the expected type
interface SearchFilters {
  categories: string[];
  tags: string[];
  difficulties: number[];
  resetTimes: { min?: number; max?: number };
  durations: { min?: number; max?: number };
  angles: string[];
  isPublic?: boolean | null;
  sortOrder?: "recent" | "last";
  tagsMode?: "and" | "or";
}

interface Props {
  section: CategorySection;
  searchQuery: string;
  searchFilters?: SearchFilters;
  onItemPress: (item: LibraryItem) => void;
  onEditCategory: (category: any) => void;
  onDeleteCategory: (categoryId: string) => void;
  onMoreOptions: (category: any) => void;
  onToggleFavorite?: (itemId: string, contentType: string) => void;
}

// Memoized library item row
const LibraryItemRow = memo(
  ({
    item,
    onPress,
    searchQuery,
  }: {
    item: LibraryItem;
    onPress: () => void;
    searchQuery?: string;
  }) => {
    // Function to determine where the search match is found
    const getSearchMatchLocation = (): string | null => {
      if (!searchQuery || searchQuery.trim() === "") return null;

      const query = searchQuery.toLowerCase().trim();

      // Check in order: Title, Notes, Secret, Effect
      if (item.title.toLowerCase().includes(query)) {
        return null; // Don't show location for title matches
      }

      if (item.notes?.toLowerCase().includes(query)) {
        return "Notes";
      }

      if (item.secret?.toLowerCase().includes(query)) {
        return "Secret";
      }

      if (item.effect?.toLowerCase().includes(query)) {
        return "Effect";
      }

      return null;
    };

    const matchLocation = getSearchMatchLocation();

    return (
      <StyledTouchableOpacity
        className="p-2 rounded-lg mb-1 border-b border-white/10"
        onPress={onPress}
      >
        <StyledView className="flex-row justify-between items-center">
          <StyledView className="flex-1">
            <Text
              style={{
                fontFamily: fontNames.light,
                fontSize: 16,
                color: "white",
                marginLeft: 8,
                includeFontPadding: false,
              }}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {matchLocation && (
              <Text
                style={{
                  fontFamily: fontNames.light,
                  fontSize: 12,
                  color: "rgba(255, 255, 255, 0.6)",
                  marginLeft: 8,
                  marginTop: 2,
                  includeFontPadding: false,
                }}
              >
                In: {matchLocation}
              </Text>
            )}
          </StyledView>
          <InlineProgressBar item={item} />
        </StyledView>
      </StyledTouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.title === nextProps.item.title &&
      prevProps.item.is_shared === nextProps.item.is_shared &&
      prevProps.item.is_favorite === nextProps.item.is_favorite &&
      prevProps.item.effect_video_url === nextProps.item.effect_video_url &&
      prevProps.item.effect === nextProps.item.effect &&
      prevProps.item.secret_video_url === nextProps.item.secret_video_url &&
      prevProps.item.secret === nextProps.item.secret &&
      prevProps.item.duration === nextProps.item.duration &&
      prevProps.item.reset === nextProps.item.reset &&
      prevProps.item.difficulty === nextProps.item.difficulty &&
      prevProps.searchQuery === nextProps.searchQuery
    );
  }
);

LibraryItemRow.displayName = "LibraryItemRow";

const CollapsibleCategoryOptimized = ({
  section,
  searchQuery,
  searchFilters,
  onItemPress,
  onEditCategory,
  onDeleteCategory,
  onMoreOptions,
  onToggleFavorite,
}: Props) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const animatedRotation = useRef(new Animated.Value(0)).current;

  // Filter items with memoization
  const filteredItems = useMemo(() => {
    if (!section.items) return [];

    return section.items.filter((item) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const matchesText =
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.effect?.toLowerCase().includes(query) ||
          item.secret?.toLowerCase().includes(query) ||
          item.notes?.toLowerCase().includes(query);
        if (!matchesText) return false;
      }
      // Public/Private filter
      if (
        searchFilters?.isPublic !== undefined &&
        searchFilters.isPublic !== null
      ) {
        // Asegurarse de que el item tenga la propiedad is_public
        const itemIsPublic = (item as any).is_public;
        if (itemIsPublic !== searchFilters.isPublic) {
          return false;
        }
      }
      // Difficulty filter - convert to string for comparison with hook expectations
      if (searchFilters?.difficulties?.length) {
        if (
          !item.difficulty ||
          !searchFilters.difficulties
            .map((d) => String(d))
            .includes(String(item.difficulty))
        ) {
          return false;
        }
      }

      // Tags filter
      if (searchFilters?.tags?.length) {
        if (!item.tags?.some((tagId) => searchFilters.tags.includes(tagId))) {
          return false;
        }
      }

      // Reset time filter
      if (
        searchFilters?.resetTimes?.min !== undefined ||
        searchFilters?.resetTimes?.max !== undefined
      ) {
        if (item.reset === null || item.reset === undefined) return false;

        if (
          searchFilters.resetTimes.min !== undefined &&
          item.reset < searchFilters.resetTimes.min
        ) {
          return false;
        }
        if (
          searchFilters.resetTimes.max !== undefined &&
          item.reset > searchFilters.resetTimes.max
        ) {
          return false;
        }
      }

      // Duration filter
      if (
        searchFilters?.durations?.min !== undefined ||
        searchFilters?.durations?.max !== undefined
      ) {
        if (item.duration === null || item.duration === undefined) return false;

        if (
          searchFilters.durations.min !== undefined &&
          item.duration < searchFilters.durations.min
        ) {
          return false;
        }
        if (
          searchFilters.durations.max !== undefined &&
          item.duration > searchFilters.durations.max
        ) {
          return false;
        }
      }

      // Angles filter
      if (searchFilters?.angles?.length) {
        if (!item.angles || !Array.isArray(item.angles)) return false;

        // Convertir todos los valores a string para comparación consistente
        const itemAngles = item.angles.map((angle) => String(angle));
        const hasMatchingAngle = searchFilters.angles.some((filterAngle) =>
          itemAngles.includes(filterAngle)
        );

        if (!hasMatchingAngle) return false;
      }

      return true;
    });
  }, [section.items, searchQuery, searchFilters]);

  // Toggle expansion
  const toggleExpanded = useCallback(() => {
    const toValue = !isExpanded ? 1 : 0;

    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(animatedRotation, {
        toValue,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    setIsExpanded(!isExpanded);
  }, [isExpanded, animatedHeight, animatedRotation]);

  // Handle item press
  const handleItemPress = useCallback(
    (item: LibraryItem) => {
      onItemPress(item);
    },
    [onItemPress]
  );

  // Handle more options
  const handleMoreOptions = useCallback(
    (e: any) => {
      e.stopPropagation();
      onMoreOptions(section.category);
    },
    [onMoreOptions, section.category]
  );

  const rotateInterpolation = animatedRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  // Don't allow editing or deleting the Favorites category
  const isFavoritesCategory = section.category.name === "Favoritos";

  return (
    <StyledView className="mb-2 px-4">
      <StyledTouchableOpacity
        className="flex-row justify-between items-center bg-[white]/10 px-3 border border-white/40 rounded-lg mb-2"
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <StyledView className="flex-row items-center flex-1">
          <Animated.View
            style={{ transform: [{ rotate: rotateInterpolation }] }}
          >
            <MaterialIcons name="chevron-right" size={20} color="white" />
          </Animated.View>
          <Text
            style={{
              fontFamily: fontNames.light,
              fontSize: 16,
              color: "white",
              marginLeft: 8,
              includeFontPadding: false,
            }}
          >
            {section.category.name}
          </Text>
        </StyledView>
        <StyledView className="flex-row items-center">
          <Text
            style={{
              fontFamily: fontNames.light,
              fontSize: 16,
              color: "white",
              marginRight: 8,
              includeFontPadding: false,
            }}
          >
            {filteredItems.length}
          </Text>
          {isFavoritesCategory ? (
            <StyledView className="p-2">
              <FontAwesome5 name="star" size={16} color="#fadc91" />
            </StyledView>
          ) : (
            <StyledTouchableOpacity onPress={handleMoreOptions} className="p-2">
              <Entypo name="dots-three-horizontal" size={16} color="white" />
            </StyledTouchableOpacity>
          )}
        </StyledView>
      </StyledTouchableOpacity>

      <Animated.View
        style={{
          maxHeight: animatedHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 500], // Adjust based on expected content
          }),
          opacity: animatedHeight,
          overflow: "hidden",
        }}
      >
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <LibraryItemRow
              key={`${item.type}-${item.id}`}
              item={item}
              onPress={() => handleItemPress(item)}
              searchQuery={searchQuery}
            />
          ))
        ) : (
          <StyledView className="border-b border-white/20 p-2 mb-1 rounded-lg">
            <Text
              style={{
                fontFamily: fontNames.light,
                fontSize: 14,
                color: "rgba(255, 255, 255, 0.5)",
                textAlign: "center",
                includeFontPadding: false,
              }}
            >
              {isFavoritesCategory
                ? t("noFavorites", "No tienes favoritos aún")
                : t("noItems", "No items in this category")}
            </Text>
          </StyledView>
        )}
      </Animated.View>
    </StyledView>
  );
};

CollapsibleCategoryOptimized.displayName = "CollapsibleCategoryOptimized";

export default CollapsibleCategoryOptimized;
