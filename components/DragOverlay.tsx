// components/DragOverlay.tsx
import React from "react";
import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  SharedValue,
  interpolate,
  Extrapolate,
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
  const animatedStyle = useAnimatedStyle(() => {
    // Añadir una ligera rotación basada en la velocidad del movimiento
    const rotation = interpolate(
      translateX.value,
      [-100, 0, 100],
      [-2, 0, 2],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
        { rotate: `${rotation}deg` },
      ],
      position: "absolute",
      top: draggedItem?.originalY || 0,
      left: 0,
      right: 0,
      zIndex: 10000,
      // Añadir sombra más pronunciada durante el drag
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

  if (!draggedItem) return null;

  return (
    <Animated.View style={animatedStyle} pointerEvents="none">
      <StyledView
        className="flex-row justify-between items-center bg-white/20 px-4 py-3 border-2 border-white/40 rounded-lg mx-4"
        style={{
          height: 60,
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          borderColor: "rgba(255, 255, 255, 0.5)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View
            style={{
              width: 4,
              height: 24,
              backgroundColor: "rgba(255, 255, 255, 0.3)",
              borderRadius: 2,
              marginRight: 12,
            }}
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
            {draggedItem.name || "Sin nombre"}
          </Text>
        </View>
        {draggedItem.itemCount !== undefined && (
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
              marginLeft: 8,
            }}
          >
            <Text
              style={{
                fontFamily: fontNames.light,
                fontSize: 14,
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              {draggedItem.itemCount}
            </Text>
          </View>
        )}
      </StyledView>
    </Animated.View>
  );
};
