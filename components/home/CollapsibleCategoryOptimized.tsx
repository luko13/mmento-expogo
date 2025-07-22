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
import Animated from "react-native-reanimated";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { MaterialIcons, Entypo } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { fontNames } from "../../app/_layout";
import InlineProgressBar from "./TrickCompletionProgress";
import { type DragDropItem, type DragDropState } from "../../hooks/useDragDrop";

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
  registerCategoryLayout?: (
    categoryId: string
  ) => (e: LayoutChangeEvent) => void;
  createDragGesture?: (item: DragDropItem) => any;
  isDraggingItem?: (item: DragDropItem) => boolean;
  draggedAnimatedStyle?: any;
  getDragOverStyle?: (item: DragDropItem) => any;
  getCategoryDragOverStyle?: (categoryId: string) => any;
}

// Memoized library item row
const LibraryItemRow = memo(
  ({
    item,
    categoryId,
    onPress,
    searchQuery,
    isDragEnabled,
    createDragGesture,
    isDraggingItem,
    draggedAnimatedStyle,
    getDragOverStyle,
  }: {
    item: LibraryItem;
    categoryId: string;
    onPress: () => void;
    searchQuery?: string;
    isDragEnabled?: boolean;
    createDragGesture?: (item: DragDropItem) => any;
    isDraggingItem?: (item: DragDropItem) => boolean;
    draggedAnimatedStyle?: any;
    getDragOverStyle?: (item: DragDropItem) => any;
  }) => {
    const dragItem: DragDropItem = {
      id: item.id,
      type: "trick",
      categoryId: categoryId,
      data: item,
    };

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
    const isDragging = isDraggingItem?.(dragItem) || false;

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

    const baseStyle = {
      padding: 8,
      borderRadius: 8,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255, 255, 255, 0.1)",
    };

    if (isDragEnabled && createDragGesture && getDragOverStyle) {
      const gesture = createDragGesture(dragItem);
      const overStyle = getDragOverStyle(dragItem);

      if (isDragging && draggedAnimatedStyle) {
        return (
          <GestureDetector gesture={gesture}>
            <Animated.View style={[baseStyle, overStyle, draggedAnimatedStyle]}>
              <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>
            </Animated.View>
          </GestureDetector>
        );
      }

      return (
        <GestureDetector gesture={gesture}>
          <TouchableOpacity onPress={onPress} style={[baseStyle, overStyle]}>
            {content}
          </TouchableOpacity>
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
  registerCategoryLayout,
  createDragGesture,
  isDraggingItem,
  draggedAnimatedStyle,
  getDragOverStyle,
  getCategoryDragOverStyle,
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

  const [isExpanded, setIsExpanded] = useState(hasActiveSearch);
  const animatedHeight = useRef(
    new RNAnimated.Value(hasActiveSearch ? 1 : 0)
  ).current;
  const animatedRotation = useRef(
    new RNAnimated.Value(hasActiveSearch ? 1 : 0)
  ).current;

  useEffect(() => {
    if (
      dragState?.isDragging &&
      dragState.draggedOverCategory === section.category.id &&
      !isExpanded
    ) {
      setIsExpanded(true);
      RNAnimated.parallel([
        RNAnimated.timing(animatedHeight, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
        RNAnimated.timing(animatedRotation, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [
    dragState,
    section.category.id,
    isExpanded,
    animatedHeight,
    animatedRotation,
  ]);

  useEffect(() => {
    const toValue = hasActiveSearch ? 1 : 0;

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

    setIsExpanded(hasActiveSearch);
  }, [hasActiveSearch, animatedHeight, animatedRotation]);

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

    setIsExpanded(!isExpanded);
  }, [isExpanded, animatedHeight, animatedRotation]);

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

  const handlePointerMove = useCallback(() => {
    if (dragState?.isDragging && onDraggedOver) {
      onDraggedOver(section.category.id);
    }
  }, [dragState, onDraggedOver, section.category.id]);

  const rotateInterpolation = animatedRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  const isFavoritesCategory = section.category.name
    .toLowerCase()
    .includes("favorit");

  // Crear drag item para esta categoría
  const categoryDragItem: DragDropItem = {
    id: section.category.id,
    type: "category",
    data: section.category,
  };

  const isDraggingThisCategory = isDraggingItem?.(categoryDragItem) || false;

  const headerContent = (
    <StyledView
      className="flex-row justify-between items-center bg-[white]/10 px-3 border border-white/40 rounded-lg mb-2"
      onPointerMove={handlePointerMove}
      onLayout={registerCategoryLayout?.(section.category.id)}
    >
      <StyledView className="flex-row items-center flex-1">
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

  // Si se está arrastrando esta categoría, aplicar el estilo animado directamente al contenedor del gesto
  if (
    isDraggingThisCategory &&
    dragGesture &&
    isDragEnabled &&
    !isFavoritesCategory &&
    draggedAnimatedStyle
  ) {
    return (
      <GestureDetector gesture={dragGesture}>
        <Animated.View
          style={[
            { marginBottom: 8, paddingHorizontal: 16 },
            draggedAnimatedStyle,
          ]}
        >
          <StyledTouchableOpacity onPress={toggleExpanded} activeOpacity={0.7}>
            {headerContent}
          </StyledTouchableOpacity>

          <RNAnimated.View
            style={{
              maxHeight: animatedHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 500],
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
                  createDragGesture={createDragGesture}
                  isDraggingItem={isDraggingItem}
                  draggedAnimatedStyle={draggedAnimatedStyle}
                  getDragOverStyle={getDragOverStyle}
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
        </Animated.View>
      </GestureDetector>
    );
  }

  // Renderizado normal cuando no se está arrastrando
  return (
    <StyledView className="mb-2 px-4">
      {dragGesture && isDragEnabled && !isFavoritesCategory ? (
        <GestureDetector gesture={dragGesture}>
          <StyledTouchableOpacity onPress={toggleExpanded} activeOpacity={0.7}>
            {headerContent}
          </StyledTouchableOpacity>
        </GestureDetector>
      ) : (
        <StyledTouchableOpacity onPress={toggleExpanded} activeOpacity={0.7}>
          {headerContent}
        </StyledTouchableOpacity>
      )}

      <RNAnimated.View
        style={{
          maxHeight: animatedHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 500],
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
              createDragGesture={createDragGesture}
              isDraggingItem={isDraggingItem}
              draggedAnimatedStyle={draggedAnimatedStyle}
              getDragOverStyle={getDragOverStyle}
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
    </StyledView>
  );
};

CollapsibleCategoryOptimized.displayName = "CollapsibleCategoryOptimized";

export default CollapsibleCategoryOptimized;
