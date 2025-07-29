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
  const { width: screenWidth } = Dimensions.get("window");
  const overlayWidth = 300;
  const overlayHeight = 60;

  // Calcular la posición base del overlay solo cuando hay un truco siendo arrastrado
  const baseX = draggedTrick?.startX
    ? draggedTrick.startX - overlayWidth / 2
    : 0;
  const baseY = draggedTrick?.startY
    ? draggedTrick.startY - overlayHeight / 2
    : 0;

  // Asegurar que no se salga de la pantalla horizontalmente
  const clampedBaseX = Math.max(
    10,
    Math.min(baseX, screenWidth - overlayWidth - 10)
  );

  const animatedStyle = useAnimatedStyle(() => {
    // Si no hay truco siendo arrastrado, ocultar el overlay
    if (!draggedTrick) {
      return {
        opacity: 0,
        transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 0 }],
      };
    }

    // Añadir una ligera rotación basada en la velocidad del movimiento
    const rotation = interpolate(
      translateX.value,
      [-100, 0, 100],
      [-3, 0, 3],
      Extrapolate.CLAMP
    );

    // Log para depuración
    console.log("🟡 OVERLAY - AnimatedStyle con movimiento", {
      translateX: translateX.value,
      translateY: translateY.value,
      scale: scale.value,
      baseX: clampedBaseX,
      baseY,
      finalX: clampedBaseX + translateX.value,
      finalY: baseY + translateY.value,
    });

    return {
      opacity: 1,
      transform: [
        { translateX: clampedBaseX + translateX.value },
        { translateY: baseY + translateY.value },
        { scale: scale.value },
        { rotate: `${rotation}deg` },
      ],
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
  }, [draggedTrick, clampedBaseX, baseY]); // Añadir dependencias

  if (!draggedTrick) {
    return null;
  }

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
            position: "absolute",
            top: 0,
            left: 0,
            width: overlayWidth,
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
