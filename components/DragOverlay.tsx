// components/DragOverlay.tsx
import React from "react";
import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  SharedValue,
} from "react-native-reanimated";
import { styled } from "nativewind";
import { fontNames } from "../app/_layout";

const StyledView = styled(View);

interface DragOverlayProps {
  draggedItem: any | null;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
}

export const DragOverlay: React.FC<DragOverlayProps> = ({
  draggedItem,
  translateX,
  translateY,
  scale,
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    position: "absolute",
    top: draggedItem?.originalY || 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  }));

  if (!draggedItem) return null;

  return (
    <Animated.View style={animatedStyle} pointerEvents="none">
      <StyledView
        className="flex-row justify-between items-center bg-white/20 px-4 py-3 border-2 border-white/40 rounded-lg mx-4"
        style={{
          height: 60,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 10,
        }}
      >
        <Text
          style={{
            fontFamily: fontNames.light,
            fontSize: 16,
            color: "white",
          }}
        >
          {draggedItem.name || "Sin nombre"}
        </Text>
        {draggedItem.itemCount !== undefined && (
          <Text
            style={{
              fontFamily: fontNames.light,
              fontSize: 14,
              color: "rgba(255, 255, 255, 0.7)",
            }}
          >
            {draggedItem.itemCount}
          </Text>
        )}
      </StyledView>
    </Animated.View>
  );
};
