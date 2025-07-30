// components/DraggableTrick.tsx
import React from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { styled } from "nativewind";
import * as Haptics from "expo-haptics";
import { fontNames } from "../app/_layout";
import InlineProgressBar from "./home/TrickCompletionProgress";

const StyledView = styled(View);

interface DraggableTrickProps {
  item: {
    id: string;
    title: string;
    type: "magic" | "gimmick" | "technique" | "script";
    difficulty?: number | null;
    is_shared?: boolean;
    effect_video_url?: string;
    effect?: string;
    secret_video_url?: string;
    secret?: string;
    duration?: number | null;
    reset?: number | null;
  };
  categoryId: string;
  index: number;
  onPress: () => void;
  onDragStart: (
    trickId: string,
    categoryId: string,
    index: number,
    startX: number,
    startY: number
  ) => void;
  onDragMove: (translationX: number, translationY: number) => void;
  onDragEnd: (finalX: number, finalY: number) => void;
  isDragging: boolean;
  draggedTrickId: string | null;
  searchQuery?: string;
}

export const DraggableTrick: React.FC<DraggableTrickProps> = ({
  item,
  categoryId,
  index,
  onPress,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDragging,
  draggedTrickId,
  searchQuery,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const isBeingDragged = useSharedValue(false);
  const trickOpacity = useSharedValue(1);

  // Efecto para controlar la opacidad cuando se arrastra
  React.useEffect(() => {
    if (draggedTrickId === item.id && isDragging) {
      trickOpacity.value = 0.3;
    } else {
      trickOpacity.value = 1;
    }
  }, [isDragging, draggedTrickId, item.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value * trickOpacity.value,
  }));

  // Función para obtener la ubicación de la coincidencia de búsqueda
  const getSearchMatchLocation = (): string | null => {
    if (!searchQuery || searchQuery.trim() === "") return null;

    const query = searchQuery.toLowerCase().trim();

    if (item.title.toLowerCase().includes(query)) {
      return null;
    }

    // Verificar en otros campos si existen
    if (item.effect?.toLowerCase().includes(query)) {
      return "Effect";
    }

    if (item.secret?.toLowerCase().includes(query)) {
      return "Secret";
    }

    return null;
  };

  const matchLocation = getSearchMatchLocation();

  // Crear gestos - versión simplificada sin measure()
  const longPressGesture = Gesture.LongPress()
    .minDuration(300)
    .onStart((event) => {
      "worklet";
      console.log("🔵 TRICK - LongPress detectado con coordenadas:", {
        absoluteX: event.absoluteX,
        absoluteY: event.absoluteY,
        x: event.x,
        y: event.y,
      });

      isBeingDragged.value = true;
      scale.value = withSpring(1.05);
      opacity.value = withSpring(0.9);
      trickOpacity.value = 0.3;

      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);

      // Usar absoluteX y absoluteY que ahora sí serán correctas
      // porque el overlay está a nivel raíz
      runOnJS(onDragStart)(
        item.id,
        categoryId,
        index,
        event.absoluteX,
        event.absoluteY
      );
    });

  const panGesture = Gesture.Pan()
    .onChange((event) => {
      "worklet";
      if (isBeingDragged.value) {
        // Log cada cierto número de eventos para no saturar
        if (Math.random() < 0.1) {
          console.log("🔵 TRICK - Pan onChange:", {
            translationX: event.translationX,
            translationY: event.translationY,
          });
        }
        runOnJS(onDragMove)(event.translationX, event.translationY);
      }
    })
    .onEnd((event) => {
      "worklet";
      console.log("🔵 TRICK - Pan onEnd:", {
        finalX: event.translationX,
        finalY: event.translationY,
      });
      if (isBeingDragged.value) {
        isBeingDragged.value = false;
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
        trickOpacity.value = 1;

        runOnJS(onDragEnd)(event.translationX, event.translationY);
      }
    })
    .onFinalize(() => {
      "worklet";
      if (isBeingDragged.value) {
        isBeingDragged.value = false;
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
        trickOpacity.value = 1;
      }
    });

  const composedGesture = Gesture.Simultaneous(longPressGesture, panGesture);

  const tapGesture = Gesture.Tap().onEnd(() => {
    "worklet";
    if (!isBeingDragged.value) {
      runOnJS(onPress)();
    }
  });

  const finalGesture = Gesture.Exclusive(composedGesture, tapGesture);

  return (
    <GestureDetector gesture={finalGesture}>
      <Animated.View style={animatedStyle}>
        <StyledView
          className="p-2 rounded-lg mb-1"
          style={{
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <StyledView className="flex-row justify-between items-center">
            <StyledView className="flex-1">
              <Text
                style={{
                  fontFamily: fontNames.light,
                  fontSize: 16,
                  color: "white",
                  marginLeft: 8,
                  includeFontPadding: false,
                }}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {matchLocation && (
                <Text
                  style={{
                    fontFamily: fontNames.light,
                    fontSize: 12,
                    color: "rgba(255, 255, 255, 0.6)",
                    marginLeft: 8,
                    marginTop: 2,
                    includeFontPadding: false,
                  }}
                >
                  In: {matchLocation}
                </Text>
              )}
            </StyledView>
            <InlineProgressBar item={item} />
          </StyledView>
        </StyledView>
      </Animated.View>
    </GestureDetector>
  );
};
