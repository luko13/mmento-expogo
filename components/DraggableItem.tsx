// components/DraggableItem.tsx
import React from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { styled } from "nativewind";
import { fontNames } from "../app/_layout";
import * as Haptics from "expo-haptics";

const StyledView = styled(View);

interface DraggableItemProps {
  item: {
    id: string;
    name: string;
    itemCount?: number;
  };
  index: number;
  onDragStart: (itemId: string, index: number) => void;
  onDragEnd: () => void;
  onLayout: () => void;
  isDragging: boolean;
  draggedItemId: string | null;
  hoveredIndex: number | null;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
  item,
  index,
  onDragStart,
  isDragging,
  draggedItemId,
  hoveredIndex,
}) => {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const itemHeight = 68; // 60 + márgenes

  // Calcular si debe moverse
  React.useEffect(() => {
    if (!isDragging || !draggedItemId || hoveredIndex === null) {
      translateY.value = withSpring(0);
      return;
    }

    // Encontrar el índice original del item arrastrado
    let draggedOriginalIndex = -1;
    if (draggedItemId === item.id) {
      draggedOriginalIndex = index;
    }

    // Si estamos arrastrando este item, ocultarlo
    if (draggedItemId === item.id) {
      scale.value = withTiming(0.001); // Casi 0 para mantener el espacio
      return;
    } else {
      scale.value = withTiming(1);
    }

    // Lógica de desplazamiento para otros items
    if (hoveredIndex !== null && index >= hoveredIndex) {
      translateY.value = withSpring(itemHeight);
    } else {
      translateY.value = withSpring(0);
    }
  }, [isDragging, draggedItemId, hoveredIndex, index, item.id, itemHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: draggedItemId === item.id ? 0 : 1,
  }));

  const gesture = Gesture.LongPress()
    .minDuration(200) // Reducido para ser más responsivo
    .onStart(() => {
      "worklet";
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      runOnJS(onDragStart)(item.id, index);
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <StyledView
          className="flex-row justify-between items-center bg-white/10 px-4 py-3 border border-white/20 rounded-lg mb-2 mx-4"
          style={{ height: 60 }}
        >
          <Text
            style={{
              fontFamily: fontNames.light,
              fontSize: 16,
              color: "white",
            }}
          >
            {item.name}
          </Text>
          {item.itemCount !== undefined && (
            <Text
              style={{
                fontFamily: fontNames.light,
                fontSize: 14,
                color: "rgba(255, 255, 255, 0.7)",
              }}
            >
              {item.itemCount}
            </Text>
          )}
        </StyledView>
      </Animated.View>
    </GestureDetector>
  );
};
