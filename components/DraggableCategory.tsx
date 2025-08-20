import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
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
  onDragStart: (
    itemId: string,
    index: number,
    startX?: number,
    startY?: number
  ) => void;
  onDragMove: (translationY: number) => void;
  onDragEnd: (finalY: number) => void;
  isDragging: boolean;
  draggedItemId: string | null;
  hoveredIndex: number | null;
  onMoreOptions: () => void;
  onToggleExpand: () => void; // ¡ahora sí es toggle real!
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
  const isBeingDragged = useSharedValue(false);
  const itemOpacity = useSharedValue(1);
  const ignoreTapRef = React.useRef(false); // evita toggle cuando se toca "..."

  React.useEffect(() => {
    if (!isDragging || !draggedItemId) {
      translateY.value = 0;
      return;
    }
    if (draggedItemId === item.id) return;
    translateY.value = 0;
  }, [isDragging, draggedItemId, item.id]);

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

  const handleTapJS = React.useCallback(() => {
    if (ignoreTapRef.current) return; // no toggle si se pulsó el menú
    onToggleExpand();
  }, [onToggleExpand]);

  // Tap (toggle expand/collapse)
  const tapGesture = Gesture.Tap()
    .maxDuration(180)
    .maxDistance(14)
    .onEnd((_e, success) => {
      "worklet";
      if (success) {
        runOnJS(handleTapJS)();
      }
    });

  // Long press para habilitar drag
  const longPressGesture = Gesture.LongPress()
    .minDuration(220)
    .onStart((e) => {
      "worklet";
      isBeingDragged.value = true;
      scale.value = withSpring(1.05);
      opacity.value = withSpring(0.9);
      itemOpacity.value = 0.3;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      // Pasamos las coords iniciales por si el overlay las quiere
      runOnJS(onDragStart)(item.id, index, e.absoluteX, e.absoluteY);
    });

  // Pan mientras está en modo drag
  const panGesture = Gesture.Pan()
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
        isBeingDragged.value = false;
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
        itemOpacity.value = 1;
        runOnJS(onDragEnd)(finalY);
      }
    })
    .onFinalize(() => {
      "worklet";
      if (isBeingDragged.value) {
        isBeingDragged.value = false;
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
        itemOpacity.value = 1;
      }
    });

  // El tap tiene prioridad sobre drag; si es tap, no arrancamos drag
  const composedGesture = Gesture.Exclusive(
    tapGesture,
    Gesture.Simultaneous(longPressGesture, panGesture)
  );

  const handleMoreOptions = (e: any) => {
    e?.stopPropagation?.();
    // Evita que el tap del header dispare toggle cuando abrimos el menú
    ignoreTapRef.current = true;
    setTimeout(() => {
      ignoreTapRef.current = false;
    }, 250);
    onMoreOptions();
  };

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[animatedStyle, { marginBottom: 8, paddingHorizontal: 16 }]}
      >
        {/* Ojo: ya NO usamos onPress aquí; el Tap gesture controla el toggle */}
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
            <StyledTouchableOpacity onPress={handleMoreOptions} className="p-2">
              <Entypo name="dots-three-horizontal" size={16} color="white" />
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      </Animated.View>
    </GestureDetector>
  );
};
