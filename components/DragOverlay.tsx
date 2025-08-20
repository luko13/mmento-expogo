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
  draggedItem: {
    id: string;
    name: string;
    itemCount?: number;
    startX?: number; // seguimos recibiendo, pero no lo usamos para centrar
    startY?: number; // absoluto ventana (sí lo usamos para Y)
  } | null;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  containerLeft: number;
  containerTop: number;
  containerWidth: number;
}

export const DragOverlay: React.FC<DragOverlayProps> = ({
  draggedItem,
  translateX,
  translateY,
  scale,
  containerLeft,
  containerTop,
  containerWidth,
}) => {
  const overlayWidth = Math.min(320, Math.max(260, containerWidth - 16));
  const overlayHeight = 60;
  const sideMargin = 8;

  const animatedStyle = useAnimatedStyle(() => {
    if (!draggedItem) {
      return {
        opacity: 0,
        position: "absolute" as const,
        left: -9999,
        top: -9999,
      };
    }

    const startY = draggedItem.startY ?? 0;
    // Convertimos Y de ventana -> Y local del contenedor
    const localStartY = startY - containerTop;

    // Centrado horizontal fijo en el contenedor
    const centeredLeft = (containerWidth - overlayWidth) / 2;

    // Queremos la tarjeta centrada vertical respecto al dedo:
    const fingerOffsetY = -overlayHeight / 2; // si la quieres por encima: -overlayHeight - 12
    const rawTop = localStartY + translateY.value + fingerOffsetY;

    // Clamp horizontal/vertical simples
    const clampedLeft = Math.max(
      sideMargin,
      Math.min(centeredLeft, containerWidth - overlayWidth - sideMargin)
    );
    const clampedTop = Math.max(sideMargin, rawTop);

    const rotation = interpolate(
      translateX.value,
      [-100, 0, 100],
      [-2, 0, 2],
      Extrapolate.CLAMP
    );

    return {
      position: "absolute" as const,
      left: clampedLeft,
      top: clampedTop,
      width: overlayWidth,
      transform: [{ scale: scale.value }, { rotate: `${rotation}deg` }],
      zIndex: 10000,
      opacity: 1,
    };
  });

  if (!draggedItem) return null;

  return (
    <Animated.View style={animatedStyle} pointerEvents="none">
      <StyledView
        className="flex-row justify-between items-center bg-white/20 px-4 py-3 border-2 border-white/40 rounded-lg"
        style={{
          height: overlayHeight,
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          borderColor: "rgba(255, 255, 255, 0.5)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 16,
          shadowOpacity: 0.35,
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
        {typeof draggedItem.itemCount === "number" && (
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
