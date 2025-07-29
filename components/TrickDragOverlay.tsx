// components/TrickDragOverlay.tsx
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
import { MaterialIcons } from "@expo/vector-icons";

const StyledView = styled(View);

interface TrickDragOverlayProps {
  draggedTrick: {
    id: string;
    title: string;
    categoryId: string;
    startX?: number;
    startY?: number;
  } | null;
  absoluteX: SharedValue<number>;
  absoluteY: SharedValue<number>;
  scale: SharedValue<number>;
}

export const TrickDragOverlay: React.FC<TrickDragOverlayProps> = ({
  draggedTrick,
  absoluteX,
  absoluteY,
  scale,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    if (!draggedTrick) return {};

    // Añadir una ligera rotación basada en el movimiento horizontal
    const rotation = interpolate(
      absoluteX.value - (draggedTrick.startX || 0),
      [-100, 0, 100],
      [-3, 0, 3],
      Extrapolate.CLAMP
    );

    return {
      position: "absolute",
      // Centrar el overlay en el punto de toque
      left: absoluteX.value - 150, // La mitad del ancho aproximado
      top: absoluteY.value - 25, // La mitad de la altura aproximada
      transform: [{ scale: scale.value }, { rotate: `${rotation}deg` }],
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
          animatedStyle,
          {
            width: 300, // Ancho fijo para el overlay
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 16,
          },
        ]}
        pointerEvents="none"
      >
        <StyledView
          className="flex-row items-center bg-white/20 px-3 py-3 border-2 border-white/50 rounded-lg"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            borderColor: "rgba(255, 255, 255, 0.6)",
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
