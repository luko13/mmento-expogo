// components/TrickDragOverlay.tsx
import React from "react";
import { View, Text, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  SharedValue,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { styled } from "nativewind";
import { fontNames } from "../app/_layout";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const StyledView = styled(View);

interface TrickDragOverlayProps {
  draggedTrick: {
    id: string;
    title: string;
    categoryId: string;
    startX?: number;
    startY?: number;
  } | null;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
}

export const TrickDragOverlay: React.FC<TrickDragOverlayProps> = ({
  draggedTrick,
  translateX,
  translateY,
  scale,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const overlayWidth = 300;
  const overlayHeight = 60;

  const animatedStyle = useAnimatedStyle(() => {
    if (!draggedTrick) {
      return {
        opacity: 0,
        position: "absolute" as const,
        left: -1000,
        top: -1000,
      };
    }

    const startX = draggedTrick.startX || 0;
    const startY = draggedTrick.startY || 0;

    const FINGER_OFFSET_X = -overlayWidth / 2;
    const FINGER_OFFSET_Y = -overlayHeight - 160;

    const rawX = startX + translateX.value + FINGER_OFFSET_X;
    const rawY = startY + translateY.value + FINGER_OFFSET_Y;

    const clampedX = Math.max(
      8,
      Math.min(rawX, screenWidth - overlayWidth - 8)
    );
    const clampedY = Math.max(
      insets.top + 8,
      Math.min(rawY, screenHeight - overlayHeight - insets.bottom - 8)
    );

    const rotation = interpolate(
      translateX.value,
      [-100, 0, 100],
      [-3, 0, 3],
      Extrapolate.CLAMP
    );

    return {
      opacity: 1,
      position: "absolute" as const,
      left: clampedX,
      top: clampedY,
      transform: [{ scale: scale.value }, { rotate: `${rotation}deg` }],
      shadowOpacity: interpolate(
        scale.value,
        [1, 1.1],
        [0.3, 0.5],
        Extrapolate.CLAMP
      ),
      elevation: interpolate(
        scale.value,
        [1, 1.1],
        [10, 20],
        Extrapolate.CLAMP
      ),
    };
  });

  if (!draggedTrick) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 10000,
      }}
    >
      <Animated.View
        style={[
          {
            width: overlayWidth,
            height: overlayHeight,
          },
          animatedStyle,
        ]}
        pointerEvents="none"
      >
        <StyledView
          className="flex-row items-center bg-white/20 px-3 py-3 border-2 border-white/50 rounded-lg"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            borderColor: "rgba(255, 255, 255, 0.6)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 16,
          }}
        >
          <MaterialIcons
            name="drag-indicator"
            size={20}
            color="rgba(255, 255, 255, 0.6)"
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              fontFamily: fontNames.light,
              fontSize: 16,
              color: "white",
              flex: 1,
            }}
            numberOfLines={1}
          >
            {draggedTrick.title}
          </Text>
          <View
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.3)",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              marginLeft: 8,
            }}
          >
            <Text
              style={{
                fontFamily: fontNames.medium,
                fontSize: 12,
                color: "rgba(16, 185, 129, 1)",
              }}
            >
              Moving...
            </Text>
          </View>
        </StyledView>
      </Animated.View>
    </View>
  );
};
