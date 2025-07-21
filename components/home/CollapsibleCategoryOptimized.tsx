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
  Animated,
  StyleSheet,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { MaterialIcons, Entypo } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { fontNames } from "../../app/_layout";
import InlineProgressBar from "./TrickCompletionProgress";
import { useDragDrop, type DragDropItem, type DragDropState } from "../../hooks/useDragDrop";
import { orderService } from "../../services/orderService";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

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
  dragGesture?: any;
  isDragEnabled?: boolean;
  onDraggedOver?: (categoryId: string) => void;
  dragState?: DragDropState;
  userId?: string | null;
}

// Memoized library item row with drag support
const LibraryItemRow = memo(
  ({
    item,
    categoryId,
    onPress,
    searchQuery,
    isDragEnabled,
    userId,
  }: {
    item: LibraryItem;
    categoryId: string;
    onPress: () => void;
    searchQuery?: string;
    isDragEnabled?: boolean;
    userId?: string | null;
  }) => {
    const { createDragGesture, getDraggedStyle, getDragOverStyle } = useDragDrop({
      enabled: isDragEnabled ?? false,
    });

    const dragItem: DragDropItem = {
      id: item.id,
      type: 'trick',
      categoryId: categoryId,
      data: item
    };

    // Function to determine where the search match is found
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

    const content = (
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

    if (isDragEnabled) {
      return (
        <GestureDetector gesture={createDragGesture(dragItem)}>
          <AnimatedTouchableOpacity
            onPress={onPress}
            style={[
              {
                padding: 8,
                borderRadius: 8,
                marginBottom: 4,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255, 255, 255, 0.1)',
              },
              getDraggedStyle(dragItem),
              getDragOverStyle(dragItem)
            ]}
          >
            {content}
          </AnimatedTouchableOpacity>
        </GestureDetector>
      );
    }

    return (
      <StyledTouchableOpacity
        className="p-2 rounded-lg mb-1 border-b border-white/10"
        onPress={onPress}
      >
        {content}
      </StyledTouchableOpacity>
    );
  },
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
      prevProps.isDragEnabled === nextProps.isDragEnabled &&
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
  dragGesture,
  isDragEnabled = false,
  onDraggedOver,
  dragState,
  userId,
}: Props) => {
  const { t } = useTranslation();

  // Check if there's an active search or filters
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

  // Initialize expanded state based on whether there's an active search
  const [isExpanded, setIsExpanded] = useState(hasActiveSearch);
  const animatedHeight = useRef(
    new Animated.Value(hasActiveSearch ? 1 : 0)
  ).current;
  const animatedRotation = useRef(
    new Animated.Value(hasActiveSearch ? 1 : 0)
  ).current;

  // Auto-expand when dragging over category
  useEffect(() => {
    if (dragState?.isDragging && dragState.draggedOverCategory === section.category.id && !isExpanded) {
      setIsExpanded(true);
      Animated.parallel([
        Animated.timing(animatedHeight, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(animatedRotation, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [dragState, section.category.id, isExpanded, animatedHeight, animatedRotation]);

  // Effect to auto-expand/collapse when search state changes
  useEffect(() => {
    const toValue = hasActiveSearch ? 1 : 0;

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

    setIsExpanded(hasActiveSearch);
  }, [hasActiveSearch, animatedHeight, animatedRotation]);

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
        const itemIsPublic = (item as any).is_public;
        if (itemIsPublic !== searchFilters.isPublic) {
          return false;
        }
      }
      
      // Difficulty filter
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

  // Handle drag over category
  const handlePointerMove = useCallback(() => {
    if (dragState?.isDragging && onDraggedOver) {
      onDraggedOver(section.category.id);
    }
  }, [dragState, onDraggedOver, section.category.id]);

  const rotateInterpolation = animatedRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  // Don't allow editing or deleting the Favorites category
  const isFavoritesCategory = section.category.name.toLowerCase().includes('favorit');

  // Create header content
  const headerContent = (
    <StyledView 
      className="flex-row justify-between items-center bg-[white]/10 px-3 border border-white/40 rounded-lg mb-2"
      onPointerMove={handlePointerMove}
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

  return (
    <StyledView className="mb-2 px-4">
      {dragGesture && isDragEnabled && !isFavoritesCategory ? (
        <GestureDetector gesture={dragGesture}>
          <StyledTouchableOpacity
            onPress={toggleExpanded}
            activeOpacity={0.7}
          >
            {headerContent}
          </StyledTouchableOpacity>
        </GestureDetector>
      ) : (
        <StyledTouchableOpacity
          onPress={toggleExpanded}
          activeOpacity={0.7}
        >
          {headerContent}
        </StyledTouchableOpacity>
      )}

      <Animated.View
        style={{
          maxHeight: animatedHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 500], // Adjust based on expected content
          }),
          opacity: animatedHeight,
          overflow: "hidden",
        }}
        onPointerMove={handlePointerMove}
      >
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <LibraryItemRow
              key={`${item.type}-${item.id}`}
              item={item}
              categoryId={section.category.id}
              onPress={() => handleItemPress(item)}
              searchQuery={searchQuery}
              isDragEnabled={isDragEnabled}
              userId={userId}
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