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
  Animated as RNAnimated,
} from "react-native";
import Animated from "react-native-reanimated";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { MaterialIcons, Entypo } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { fontNames } from "../../app/_layout";
import InlineProgressBar from "./TrickCompletionProgress";
import { DraggableTrick } from "../DraggableTrick";
import { CATEGORY_ROW_HEIGHT, TRICK_ROW_HEIGHT } from "../../utils/dragLayout";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const SHOW_DROP_TARGET_FILL = false;

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
  onTrickDragStart?: (
    trickId: string,
    categoryId: string,
    index: number,
    startX: number,
    startY: number
  ) => void;
  onTrickDragMove?: (translationX: number, translationY: number) => void;
  onTrickDragEnd?: (finalX: number, finalY: number) => void;
  isDraggingTrick?: boolean;
  draggedTrickId?: string | null;
  isDropTarget?: boolean;
}

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
    const getSearchMatchLocation = (): string | null => {
      if (!searchQuery || searchQuery.trim() === "") return null;

      const query = searchQuery.toLowerCase().trim();

      if (item.title.toLowerCase().includes(query)) return null;
      if (item.notes?.toLowerCase().includes(query)) return "Notes";
      if (item.secret?.toLowerCase().includes(query)) return "Secret";
      if (item.effect?.toLowerCase().includes(query)) return "Effect";
      return null;
    };

    const matchLocation = getSearchMatchLocation();

    return (
      <StyledTouchableOpacity
        style={{
          paddingHorizontal: 8,
          paddingVertical: 6,
          borderRadius: 8,
          marginBottom: 4,
          minHeight: TRICK_ROW_HEIGHT,
          justifyContent: "center",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255, 255, 255, 0.1)",
        }}
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
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.title === next.item.title &&
    prev.searchQuery === next.searchQuery
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
  onTrickDragStart,
  onTrickDragMove,
  onTrickDragEnd,
  isDraggingTrick,
  draggedTrickId,
  isDropTarget,
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
    if (isDropTarget && !isExpanded) {
      const timer = setTimeout(() => {
        setIsExpanded(true);
        onExpandChange?.(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isDropTarget, isExpanded, onExpandChange]);

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

  // Los items ya vienen filtrados desde LibraryDataContext.buildSections()
  // No necesitamos volver a filtrar aquí, solo usar los items directamente
  const filteredItems = useMemo(() => {
    if (!section.items) return [];
    return section.items;
  }, [section.items]);

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

  const headerContent = (
    <StyledView
      className={`flex-row justify-between items-center px-3 border rounded-lg mb-2 ${
        isDropTarget
          ? "bg-emerald-900/30 border-emerald-500/60"
          : "bg-[white]/10 border-white/40"
      }`}
      style={{
        height: 36,
      }}
    >
      <StyledView className="flex-row items-center flex-1">
        <RNAnimated.View
          style={{
            transform: [{ rotate: rotateInterpolation }],
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 3,
          }}
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
            textAlignVertical: 'center',
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
        filteredItems.map((item, index) => {
          return (
            <DraggableTrick
              key={`${item.type}-${item.id}`}
              item={item}
              categoryId={section.category.id}
              index={index}
              onPress={() => handleItemPress(item)}
              searchQuery={searchQuery}
            />
          );
        })
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

  return (
    <StyledView
      style={{
        marginBottom: 8,
        paddingHorizontal: 16,
        position: "relative",
      }}
    >
      {isDropTarget && (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 16,
            right: 16,
            bottom: 0,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: "rgba(16, 185, 129, 0.7)",
            backgroundColor: SHOW_DROP_TARGET_FILL
              ? "rgba(16, 185, 129, 0.12)"
              : "transparent",
            pointerEvents: "none",
            zIndex: 20,
          }}
        />
      )}

      <StyledTouchableOpacity onPress={toggleExpanded} activeOpacity={0.7}>
        {headerContent}
      </StyledTouchableOpacity>
      {expandedContent}
    </StyledView>
  );
};

CollapsibleCategoryOptimized.displayName = "CollapsibleCategoryOptimized";
export default CollapsibleCategoryOptimized;
