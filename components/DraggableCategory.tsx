// components/DraggableCategory.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  withSpring,
  Easing,
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
  draggedItemOriginalIndex?: number; // Añadir esta prop
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
  draggedItemOriginalIndex,
}) => {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const itemHeight = 68;
  const isBeingDragged = useSharedValue(false);
  const startY = useSharedValue(0);
  const itemOpacity = useSharedValue(1); // Valor separado para la opacidad del item arrastrado

  // Efecto para manejar el desplazamiento - SIMPLIFICADO SIN ANIMACIONES
  React.useEffect(() => {
    // Si no hay drag activo, no hacer nada
    if (!isDragging || !draggedItemId) {
      translateY.value = 0;
      return;
    }

    // Si este es el item siendo arrastrado, no moverlo
    if (draggedItemId === item.id) {
      return;
    }

    // Sin animaciones de desplazamiento - solo resetear
    translateY.value = 0;
  }, [isDragging, draggedItemId, item.id]);

  // Efecto para controlar la opacidad del item arrastrado
  React.useEffect(() => {
    if (draggedItemId === item.id && isDragging) {
      itemOpacity.value = 0.3;
    } else {
      itemOpacity.value = 1;
    }
  }, [isDragging, draggedItemId, item.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value * itemOpacity.value,
    zIndex: isBeingDragged.value ? 1000 : 1,
  }));

  // Crear gestos combinados
  const longPressGesture = Gesture.LongPress()
    .minDuration(200)
    .onStart(() => {
      "worklet";
      isBeingDragged.value = true;
      scale.value = withSpring(1.05);
      opacity.value = withSpring(0.9);
      itemOpacity.value = 0.3; // Hacer semi-transparente inmediatamente
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

        // Resetear valores locales
        isBeingDragged.value = false;
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
        itemOpacity.value = 1; // Restaurar opacidad inmediatamente

        // Llamar a onDragEnd
        runOnJS(onDragEnd)(finalY);
      }
    })
    .onFinalize(() => {
      "worklet";
      // Solo resetear si algo salió mal
      if (isBeingDragged.value) {
        isBeingDragged.value = false;
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
        itemOpacity.value = 1; // Asegurar que se restaure
      }
    });

  // Combinar gestos para que funcionen simultáneamente
  const composedGesture = Gesture.Simultaneous(longPressGesture, panGesture);

  const handleMoreOptions = (e: any) => {
    e.stopPropagation();
    onMoreOptions();
  };

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[animatedStyle, { marginBottom: 8, paddingHorizontal: 16 }]}
      >
        <TouchableOpacity onPress={onToggleExpand} activeOpacity={0.7}>
          <StyledView className="flex-row justify-between items-center bg-[white]/10 px-3 border border-white/40 rounded-lg mb-2">
            <StyledView className="flex-row items-center flex-1">
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
