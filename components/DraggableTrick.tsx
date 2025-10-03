// components/DraggableTrick.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { styled } from "nativewind";
import { fontNames } from "../app/_layout";
import InlineProgressBar from "./home/TrickCompletionProgress";

const StyledView = styled(View);

interface DraggableTrickProps {
  item: {
    id: string;
    title: string;
    type: "magic" | "gimmick" | "technique" | "script";
    difficulty?: number | null;
    is_shared?: boolean;
    effect_video_url?: string;
    effect?: string;
    secret_video_url?: string;
    secret?: string;
    duration?: number | null;
    reset?: number | null;
  };
  categoryId: string;
  index: number;
  onPress: () => void;
  onDragStart?: (
    trickId: string,
    categoryId: string,
    index: number,
    startX: number,
    startY: number
  ) => void;
  onDragMove?: (translationX: number, translationY: number) => void;
  onDragEnd?: (finalX: number, finalY: number) => void;
  isDragging?: boolean;
  draggedTrickId?: string | null;
  searchQuery?: string;
}

export const DraggableTrick: React.FC<DraggableTrickProps> = ({
  item,
  onPress,
  searchQuery,
}) => {
  const tapOpacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: tapOpacity.value,
  }));

  const getSearchMatchLocation = (): string | null => {
    if (!searchQuery || searchQuery.trim() === "") return null;

    const query = searchQuery.toLowerCase().trim();

    if (item.title.toLowerCase().includes(query)) {
      return null;
    }

    if (item.effect?.toLowerCase().includes(query)) {
      return "Effect";
    }

    if (item.secret?.toLowerCase().includes(query)) {
      return "Secret";
    }

    return null;
  };

  const matchLocation = getSearchMatchLocation();

  const handlePressIn = () => {
    tapOpacity.value = withTiming(0.5, { duration: 100 });
  };

  const handlePressOut = () => {
    tapOpacity.value = withTiming(1, { duration: 150 });
  };

  const handlePress = () => {
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View style={animatedStyle}>
        <StyledView
          className="p-2 rounded-lg mb-1"
          style={{
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255, 255, 255, 0.1)",
          }}
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
        </StyledView>
      </Animated.View>
    </TouchableOpacity>
  );
};
