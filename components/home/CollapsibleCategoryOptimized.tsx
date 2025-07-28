// components/home/CollapsibleCategoryOptimized.tsx
import React, {
  memo,
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated as RNAnimated,
  LayoutChangeEvent,
} from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { MaterialIcons, Entypo } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { GestureDetector } from "react-native-gesture-handler";
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
  isExpanded?: boolean;
}

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
  isDragEnabled?: boolean;
  onExpandChange?: (isExpanded: boolean) => void;
}

// Memoized library item row
const LibraryItemRow = memo(
  ({
    item,
    categoryId,
    onPress,
    searchQuery,
  }: {
    item: LibraryItem;
    categoryId: string;
    onPress: () => void;
    searchQuery?: string;
  }) => {
    const getSearchMatchLocation = (): string | null => {
      if (!searchQuery || searchQuery.trim() === "") return null;

      const query = searchQuery.toLowerCase().trim();

      if (item.title.toLowerCase().includes(query)) {
        return null;
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

    // Función para renderizar el contenido del elemento
    const renderContent = () => (
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
    );

    const baseStyle = {
      padding: 8,
      borderRadius: 8,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255, 255, 255, 0.1)",
    };

    return (
      <StyledTouchableOpacity style={baseStyle} onPress={onPress}>
        {renderContent()}
      </StyledTouchableOpacity>
    );
  },
  // Optimización de props para evitar re-renders innecesarios
  (prevProps, nextProps) => {
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
      prevProps.searchQuery === nextProps.searchQuery &&
      prevProps.categoryId === nextProps.categoryId
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
  isDragEnabled = false,
  onExpandChange,
}: Props) => {
  const { t } = useTranslation();

  const hasActiveSearch = useMemo(() => {
    if (searchQuery && searchQuery.trim() !== "") return true;

    if (searchFilters) {
      if (searchFilters.categories?.length > 0) return true;
      if (searchFilters.tags?.length > 0) return true;
      if (searchFilters.difficulties?.length > 0) return true;
      if (searchFilters.angles?.length > 0) return true;
      if (
        searchFilters.resetTimes?.min !== undefined ||
        searchFilters.resetTimes?.max !== undefined
      )
        return true;
      if (
        searchFilters.durations?.min !== undefined ||
        searchFilters.durations?.max !== undefined
      )
        return true;
      if (
        searchFilters.isPublic !== undefined &&
        searchFilters.isPublic !== null
      )
        return true;
    }

    return false;
  }, [searchQuery, searchFilters]);

  const [isExpanded, setIsExpanded] = useState(
    section.isExpanded || hasActiveSearch
  );
  const animatedHeight = useRef(
    new RNAnimated.Value(isExpanded ? 1 : 0)
  ).current;
  const animatedRotation = useRef(
    new RNAnimated.Value(isExpanded ? 1 : 0)
  ).current;

  useEffect(() => {
    const toValue = hasActiveSearch ? 1 : isExpanded ? 1 : 0;

    RNAnimated.parallel([
      RNAnimated.timing(animatedHeight, {
        toValue,
        duration: 250,
        useNativeDriver: false,
      }),
      RNAnimated.timing(animatedRotation, {
        toValue,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    if (hasActiveSearch && !isExpanded) {
      setIsExpanded(true);
      onExpandChange?.(true);
    }
  }, [
    hasActiveSearch,
    isExpanded,
    animatedHeight,
    animatedRotation,
    onExpandChange,
  ]);

  const filteredItems = useMemo(() => {
    if (!section.items) return [];

    return section.items.filter((item) => {
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

      if (
        searchFilters?.isPublic !== undefined &&
        searchFilters.isPublic !== null
      ) {
        const itemIsPublic = (item as any).is_public;
        if (itemIsPublic !== searchFilters.isPublic) {
          return false;
        }
      }

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

      if (searchFilters?.tags?.length) {
        if (!item.tags?.some((tagId) => searchFilters.tags.includes(tagId))) {
          return false;
        }
      }

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

      if (searchFilters?.angles?.length) {
        if (!item.angles || !Array.isArray(item.angles)) return false;

        const itemAngles = item.angles.map((angle) => String(angle));
        const hasMatchingAngle = searchFilters.angles.some((filterAngle) =>
          itemAngles.includes(filterAngle)
        );

        if (!hasMatchingAngle) return false;
      }

      return true;
    });
  }, [section.items, searchQuery, searchFilters]);

  const toggleExpanded = useCallback(() => {
    const toValue = !isExpanded ? 1 : 0;

    RNAnimated.parallel([
      RNAnimated.timing(animatedHeight, {
        toValue,
        duration: 250,
        useNativeDriver: false,
      }),
      RNAnimated.timing(animatedRotation, {
        toValue,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);

    // Notificar al padre sobre el cambio
    onExpandChange?.(newExpandedState);
  }, [isExpanded, animatedHeight, animatedRotation, onExpandChange]);

  const handleItemPress = useCallback(
    (item: LibraryItem) => {
      onItemPress(item);
    },
    [onItemPress]
  );

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

  const isFavoritesCategory = section.category.name
    .toLowerCase()
    .includes("favorit");

  const containerStyle = [{ marginBottom: 8, paddingHorizontal: 16 }];

  const headerContent = (
    <StyledView className="flex-row justify-between items-center bg-[white]/10 px-3 border border-white/40 rounded-lg mb-2">
      <StyledView className="flex-row items-center flex-1 py-3">
        <RNAnimated.View
          style={{ transform: [{ rotate: rotateInterpolation }] }}
        >
          <MaterialIcons name="chevron-right" size={20} color="white" />
        </RNAnimated.View>
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
            <FontAwesome5 name="star" size={16} color="#ffffff" />
          </StyledView>
        ) : (
          <StyledTouchableOpacity onPress={handleMoreOptions} className="p-2">
            <Entypo name="dots-three-horizontal" size={16} color="white" />
          </StyledTouchableOpacity>
        )}
      </StyledView>
    </StyledView>
  );

  const expandedContent = (
    <RNAnimated.View
      style={{
        maxHeight: animatedHeight.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 500],
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
            categoryId={section.category.id}
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
              ? t("noFavorites", "No favorites yet")
              : t("noItems", "No items in this category")}
          </Text>
        </StyledView>
      )}
    </RNAnimated.View>
  );

  // Renderizado normal
  return (
    <StyledView style={containerStyle}>
      <StyledTouchableOpacity onPress={toggleExpanded} activeOpacity={0.7}>
        {headerContent}
      </StyledTouchableOpacity>
      {expandedContent}
    </StyledView>
  );
};

CollapsibleCategoryOptimized.displayName = "CollapsibleCategoryOptimized";

export default CollapsibleCategoryOptimized;
