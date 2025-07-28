// components/DraggableCategory.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { styled } from "nativewind";
import { MaterialIcons, Entypo } from "@expo/vector-icons";
import { fontNames } from "../app/_layout";
import * as Haptics from "expo-haptics";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface DraggableCategoryProps {
  item: {
    id: string;
    name: string;
    itemCount: number;
    category: any;
  };
  index: number;
  onDragStart: (itemId: string, index: number) => void;
  onDragMove: (translationY: number) => void;
  onDragEnd: (finalY: number) => void;
  isDragging: boolean;
  draggedItemId: string | null;
  hoveredIndex: number | null;
  onMoreOptions: () => void;
  onToggleExpand: () => void;
}

export const DraggableCategory: React.FC<DraggableCategoryProps> = ({
  item,
  index,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDragging,
  draggedItemId,
  hoveredIndex,
  onMoreOptions,
  onToggleExpand,
}) => {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const itemHeight = 68;
  const isBeingDragged = useSharedValue(false);
  const startY = useSharedValue(0);

  // Efecto para manejar el desplazamiento cuando otros items se mueven
  React.useEffect(() => {
    if (!isDragging || !draggedItemId || hoveredIndex === null) {
      translateY.value = withSpring(0);
      return;
    }

    if (draggedItemId === item.id) {
      // Este item está siendo arrastrado - ocultarlo
      return;
    }

    // Calcular si este item debe moverse
    if (hoveredIndex !== null && index >= hoveredIndex) {
      translateY.value = withSpring(itemHeight);
    } else {
      translateY.value = withSpring(0);
    }
  }, [isDragging, draggedItemId, hoveredIndex, index, item.id, itemHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
    zIndex: isBeingDragged.value ? 1000 : 1,
  }));

  // Crear gestos combinados
  const longPressGesture = Gesture.LongPress()
    .minDuration(200)
    .onStart(() => {
      "worklet";
      isBeingDragged.value = true;
      scale.value = withSpring(1.1);
      opacity.value = withSpring(0.9);
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      runOnJS(onDragStart)(item.id, index);
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      "worklet";
      startY.value = 0;
    })
    .onChange((event) => {
      "worklet";
      if (isBeingDragged.value) {
        runOnJS(onDragMove)(event.translationY);
      }
    })
    .onEnd((event) => {
      "worklet";
      if (isBeingDragged.value) {
        const finalY = event.translationY;

        // NO resetear isBeingDragged aquí para que onDragEnd pueda usarlo
        // Solo resetear las animaciones visuales
        scale.value = withSpring(1);
        opacity.value = withSpring(1);

        runOnJS(onDragEnd)(finalY);
      }
    })
    .onFinalize(() => {
      "worklet";
      // Solo resetear después de que todo haya terminado
      isBeingDragged.value = false;
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
    });

  // Combinar gestos para que funcionen simultáneamente
  const composedGesture = Gesture.Simultaneous(longPressGesture, panGesture);

  const handleMoreOptions = (e: any) => {
    e.stopPropagation();
    onMoreOptions();
  };

  // Si este item está siendo arrastrado, hacerlo casi invisible
  const isDraggedStyle =
    draggedItemId === item.id
      ? {
          opacity: 0.001,
          transform: [{ scale: 0.001 }],
        }
      : {};

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          animatedStyle,
          { marginBottom: 8, paddingHorizontal: 16 },
          isDraggedStyle,
        ]}
      >
        <TouchableOpacity onPress={onToggleExpand} activeOpacity={0.7}>
          <StyledView className="flex-row justify-between items-center bg-[white]/10 px-3 border border-white/40 rounded-lg mb-2">
            <StyledView className="flex-row items-center flex-1 py-3">
              <MaterialIcons name="chevron-right" size={20} color="white" />
              <Text
                style={{
                  fontFamily: fontNames.light,
                  fontSize: 16,
                  color: "white",
                  marginLeft: 8,
                  includeFontPadding: false,
                }}
              >
                {item.name}
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
                {item.itemCount}
              </Text>
              <StyledTouchableOpacity
                onPress={handleMoreOptions}
                className="p-2"
              >
                <Entypo name="dots-three-horizontal" size={16} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
};
