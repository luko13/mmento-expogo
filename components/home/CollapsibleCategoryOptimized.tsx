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
import { MaterialIcons, Entypo, Feather } from "@expo/vector-icons";
import type { SearchFilters } from "./CompactSearchBar";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface LibraryItem {
  id: string;
  title: string;
  type: "magic" | "gimmick" | "technique" | "script";
  difficulty?: number | null;
  is_shared?: boolean;
  tags?: string[];
  description?: string;
}

interface CategorySection {
  category: any;
  items: LibraryItem[];
}

interface Props {
  section: CategorySection;
  searchQuery: string;
  searchFilters?: SearchFilters;
  onItemPress: (item: LibraryItem) => void;
  onEditCategory: (category: any) => void;
  onDeleteCategory: (categoryId: string) => void;
  onMoreOptions: (category: any) => void;
}

// Memoized library item row
const LibraryItemRow = memo(
  ({ item, onPress }: { item: LibraryItem; onPress: () => void }) => {
    return (
      <StyledTouchableOpacity
        className="flex-row justify-between items-center p-3 rounded-lg mb-1 border-b border-white/10"
        onPress={onPress}
      >
        <StyledView className="flex-row items-center flex-1">
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
          </StyledView>
        </StyledView>
      </StyledTouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.title === nextProps.item.title &&
      prevProps.item.is_shared === nextProps.item.is_shared
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
          item.description?.toLowerCase().includes(query);
        if (!matchesText) return false;
      }

      // Difficulty filter
      if (searchFilters?.difficulties?.length) {
        if (
          !item.difficulty ||
          !searchFilters.difficulties.includes(String(item.difficulty))
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

  return (
    <StyledView className="mb-4 px-4">
      <StyledTouchableOpacity
        className="flex-row justify-between items-center bg-white/10 px-3 border border-white/40 rounded-lg mb-2"
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
          <StyledTouchableOpacity onPress={handleMoreOptions} className="p-2">
            <Entypo name="dots-three-horizontal" size={16} color="white" />
          </StyledTouchableOpacity>
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
};

CollapsibleCategoryOptimized.displayName = "CollapsibleCategoryOptimized";

export default CollapsibleCategoryOptimized;
