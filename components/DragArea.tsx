// components/DragArea.tsx - Versión con más logs y manejo de errores
import React, { useCallback, useState, useEffect } from "react";
import { View, Text, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { styled } from "nativewind";
import * as Haptics from "expo-haptics";
import { fontNames } from "../app/_layout";

const StyledView = styled(View);

interface DragAreaProps {
  children: React.ReactNode;
  draggedItem: any | null;
  onDrop: (newIndex: number) => void;
  onUpdateHoveredIndex: (index: number | null) => void;
  currentIndex: number;
}

export const DragArea: React.FC<DragAreaProps> = ({
  children,
  draggedItem,
  onDrop,
  onUpdateHoveredIndex,
  currentIndex,
}) => {
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const scale = useSharedValue(1);
  const [isActive, setIsActive] = useState(false);

  // Funciones auxiliares para logs seguros
  const logInfo = useCallback((message: string, data?: any) => {
    
  }, []);

  const logError = useCallback((message: string, error: any) => {
    console.error(`🔴 DragArea ERROR - ${message}`, error);
  }, []);

  // Reset cuando cambia el draggedItem
  useEffect(() => {
    logInfo("draggedItem cambió:", draggedItem);

    if (draggedItem) {
      setIsActive(true);
      scale.value = withSpring(1.05);
    } else {
      setIsActive(false);
      scale.value = withSpring(1);
      dragX.value = withSpring(0);
      dragY.value = withSpring(0);
    }
  }, [draggedItem]);

  // Callbacks seguros para runOnJS
  const safeSetIsActive = useCallback((value: boolean) => {
    try {
      setIsActive(value);
    } catch (error) {
      logError("Error en setIsActive:", error);
    }
  }, []);

  const safeOnUpdateHoveredIndex = useCallback(
    (index: number | null) => {
      try {
        logInfo("Actualizando hoveredIndex:", index);
        onUpdateHoveredIndex(index);
      } catch (error) {
        logError("Error en onUpdateHoveredIndex:", error);
      }
    },
    [onUpdateHoveredIndex]
  );

  const safeOnDrop = useCallback(
    (finalIndex: number) => {
      try {
        logInfo("Llamando a onDrop con índice:", finalIndex);
        onDrop(finalIndex);
        setIsActive(false);
      } catch (error) {
        logError("Error en onDrop:", error);
        // Asegurar que limpiamos el estado incluso si hay error
        setIsActive(false);
      }
    },
    [onDrop]
  );

  const gesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((e, state) => {
      // Activar inmediatamente cuando hay un item seleccionado
      if (draggedItem && !isActive) {
        state.activate();
      }
    })
    .onStart((event) => {
      "worklet";
      ");
      runOnJS(safeSetIsActive)(true);
    })
    .onChange((event) => {
      "worklet";
      try {
        if (!draggedItem) {
          
          return;
        }

        dragX.value = event.translationX;
        dragY.value = event.translationY;

        // Calcular el índice basado en la posición
        const itemHeight = 68;
        const displacement = event.translationY;
        const indexOffset = Math.round(displacement / itemHeight);

        // Asegurar que currentIndex es válido
        const safeCurrentIndex = currentIndex || 0;
        const newIndex = Math.max(0, safeCurrentIndex + indexOffset);

         - cálculo:", {
          displacement,
          indexOffset,
          currentIndex: safeCurrentIndex,
          newIndex,
        });

        runOnJS(safeOnUpdateHoveredIndex)(newIndex);
      } catch (error) {
        console.error("🔴 Error en onChange:", error);
      }
    })
    .onEnd((event) => {
      "worklet";
       - INICIO");

      try {
        if (!draggedItem) {
          
          return;
        }

        const itemHeight = 68;
        const displacement = dragY.value;
        const indexOffset = Math.round(displacement / itemHeight);

        // Asegurar que currentIndex es válido
        const safeCurrentIndex = currentIndex || 0;
        const finalIndex = Math.max(0, safeCurrentIndex + indexOffset);

         - cálculo:", {
          displacement,
          indexOffset,
          currentIndex: safeCurrentIndex,
          finalIndex,
        });

        // Animar de vuelta a la posición original
        dragX.value = withSpring(0);
        dragY.value = withSpring(0);
        scale.value = withSpring(1);

        // Llamar a onDrop en el JS thread
        runOnJS(safeOnDrop)(finalIndex);

         - FIN");
      } catch (error) {
        console.error("🔴 Error en onEnd (worklet):", error);
        // Intentar limpiar estados
        runOnJS(safeSetIsActive)(false);
      }
    })
    .onFinalize(() => {
      "worklet";
      ");
      runOnJS(safeSetIsActive)(false);
    });

  const animatedStyle = useAnimatedStyle(() => {
    try {
      return {
        transform: [
          { translateX: dragX.value },
          { translateY: dragY.value },
          { scale: scale.value },
        ],
        zIndex: 1000,
      };
    } catch (error) {
      console.error("🔴 Error en animatedStyle:", error);
      return { zIndex: 1000 };
    }
  });

  if (!draggedItem) {
    return <>{children}</>;
  }

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1 }}>
        {children}
        {draggedItem && (
          <Animated.View
            style={[
              {
                position: "absolute",
                top: draggedItem.originalY || 0,
                left: 0,
                right: 0,
              },
              animatedStyle,
            ]}
            pointerEvents="none"
          >
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
        )}
      </View>
    </GestureDetector>
  );
};
