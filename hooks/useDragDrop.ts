// hooks/useDragDrop.ts
import { useState, useCallback, useRef } from "react";
import {
  Vibration,
  LayoutAnimation,
  UIManager,
  Platform,
  LayoutChangeEvent,
} from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { useDragPortal } from "../components/DragPortal";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface DragDropItem {
  id: string;
  type: "category" | "trick";
  categoryId?: string;
  data: any;
}

export interface DragDropState {
  isDragging: boolean;
  draggedItem: DragDropItem | null;
  draggedOverItem: DragDropItem | null;
  draggedOverCategory: string | null;
}

interface UseDragDropProps {
  onDragStart?: (item: DragDropItem) => void;
  onDragEnd?: (
    item: DragDropItem,
    targetItem?: DragDropItem,
    targetCategory?: string
  ) => void;
  onDragOver?: (item: DragDropItem) => void;
  enabled?: boolean;
}

export const useDragDrop = ({
  onDragStart,
  onDragEnd,
  onDragOver,
  enabled = true,
}: UseDragDropProps) => {
  
  const { setDraggedElement, setDraggedStyle } = useDragPortal();

  const [dragState, setDragState] = useState<DragDropState>({
    isDragging: false,
    draggedItem: null,
    draggedOverItem: null,
    draggedOverCategory: null,
  });

  const categoryLayouts = useRef<
    Record<string, { x: number; y: number; width: number; height: number }>
  >({});

  const itemLayouts = useRef<
    Record<
      string,
      {
        x: number;
        y: number;
        width: number;
        height: number;
        categoryId: string;
      }
    >
  >({});

  // Posición absoluta para el portal
  const absoluteX = useSharedValue(0);
  const absoluteY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Posición inicial del elemento
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Shared values para tracking
  const draggedItemId = useSharedValue<string | null>(null);
  const draggedOverItemId = useSharedValue<string | null>(null);
  const draggedOverCategoryId = useSharedValue<string | null>(null);

  // Ref para el elemento que se está arrastrando
  const elementRef = useRef<any>(null);
  const clonedElement = useRef<React.ReactNode>(null);

  // Estilo animado para el portal
  const portalAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: absoluteX.value },
        { translateY: absoluteY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
      position: "absolute" as const,
      zIndex: 10000,
    };
  });

  // Start drag con elemento clonado
  const startDrag = useCallback(
    (
      item: DragDropItem,
      element: React.ReactNode,
      initialPosition: { x: number; y: number }
    ) => {
      if (!enabled) return;

      
      Vibration.vibrate(50);

      // Guardar posición inicial
      startX.value = initialPosition.x;
      startY.value = initialPosition.y;
      absoluteX.value = initialPosition.x;
      absoluteY.value = initialPosition.y;

      // Guardar el elemento clonado
      clonedElement.current = element;

      // Establecer el elemento y estilo en el portal
      setDraggedElement(element);
      setDraggedStyle(portalAnimatedStyle);

      setDragState({
        isDragging: true,
        draggedItem: item,
        draggedOverItem: null,
        draggedOverCategory: null,
      });

      draggedItemId.value = item.id;
      draggedOverItemId.value = null;
      draggedOverCategoryId.value = null;

      // Animación inicial
      scale.value = withSpring(1.1, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(0.95, { duration: 200 });

      onDragStart?.(item);
    },
    [
      enabled,
      onDragStart,
      setDraggedElement,
      setDraggedStyle,
      portalAnimatedStyle,
    ]
  );

  // Set dragged over
  const setDraggedOver = useCallback(
    (item: DragDropItem | null, category: string | null) => {
      setDragState((prev) => ({
        ...prev,
        draggedOverItem: item,
        draggedOverCategory: category,
      }));

      draggedOverItemId.value = item ? item.id : null;
      draggedOverCategoryId.value = category;

      if (item) {
        onDragOver?.(item);
        Vibration.vibrate(10);
      }
    },
    [onDragOver]
  );

  // End drag
  const endDrag = useCallback(
    (item: DragDropItem, targetItemId?: string, targetCategoryId?: string) => {
      

      // Animar de vuelta o desaparecer
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });

      // Limpiar el portal después de la animación
      setTimeout(() => {
        setDraggedElement(null);
        setDraggedStyle({});
        clonedElement.current = null;

        setDragState({
          isDragging: false,
          draggedItem: null,
          draggedOverItem: null,
          draggedOverCategory: null,
        });

        draggedItemId.value = null;
        draggedOverItemId.value = null;
        draggedOverCategoryId.value = null;
      }, 250);

      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          200,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity
        )
      );

      const targetItem = targetItemId
        ? {
            id: targetItemId,
            type: "trick" as const,
            categoryId: targetCategoryId,
            data: {},
          }
        : undefined;

      onDragEnd?.(item, targetItem, targetCategoryId);
    },
    [onDragEnd, setDraggedElement, setDraggedStyle]
  );

  // Check collision with categories
  const checkCategoryCollision = useCallback(
    (absX: number, absY: number) => {
      let foundCategory: string | null = null;

      for (const [catId, layout] of Object.entries(categoryLayouts.current)) {
        if (
          absX >= layout.x &&
          absX <= layout.x + layout.width &&
          absY >= layout.y &&
          absY <= layout.y + layout.height
        ) {
          foundCategory = catId;
          break;
        }
      }

      if (foundCategory !== dragState.draggedOverCategory) {
        setDraggedOver(null, foundCategory);
      }
    },
    [setDraggedOver, dragState.draggedOverCategory]
  );

  // Create drag gesture con renderElement callback
  const createDragGesture = useCallback(
    (item: DragDropItem, renderElement?: () => React.ReactNode) => {
      if (!enabled) return Gesture.Tap();

      let initialPageX = 0;
      let initialPageY = 0;
      let hasStarted = false;

      return Gesture.Pan()
        .onBegin(() => {
          "worklet";
          hasStarted = false;
        })
        .onStart((event) => {
          "worklet";
          console.log(
            "🖐️ onStart worklet!",
            event.translationX,
            event.translationY
          );

          if (!hasStarted) {
            hasStarted = true;

            runOnJS(() => {
              // Obtener la posición absoluta del touch
              const element = renderElement ? renderElement() : null;
              if (element) {
                const pageX = event.absoluteX;
                const pageY = event.absoluteY;
                initialPageX = pageX;
                initialPageY = pageY;
                startDrag(item, element, { x: pageX, y: pageY });
              }
            })();
          }
        })
        .onUpdate((event) => {
          "worklet";
          

          if (hasStarted) {
            // Actualizar posición absoluta en el portal
            absoluteX.value = initialPageX + event.translationX;
            absoluteY.value = initialPageY + event.translationY;

            // Check collision after significant movement
            if (
              Math.abs(event.translationX) > 10 ||
              Math.abs(event.translationY) > 10
            ) {
              runOnJS(checkCategoryCollision)(
                initialPageX + event.translationX,
                initialPageY + event.translationY
              );
            }
          }
        })
        .onEnd(() => {
          "worklet";

          if (hasStarted) {
            runOnJS(endDrag)(
              item,
              draggedOverItemId.value ?? undefined,
              draggedOverCategoryId.value ?? undefined
            );
          }
        })
        .shouldCancelWhenOutside(false)
        .enabled(enabled)
        .minDistance(5);
    },
    [enabled, startDrag, endDrag, checkCategoryCollision, absoluteX, absoluteY]
  );

  // Register layouts
  const registerCategoryLayout = useCallback(
    (categoryId: string) => (e: LayoutChangeEvent) => {
      const { target } = e;
      // Usar setTimeout para asegurar que la medición sea correcta
      setTimeout(() => {
        if (target) {
          target.measure((x, y, width, height, pageX, pageY) => {
            if (pageX !== undefined && pageY !== undefined) {
              categoryLayouts.current[categoryId] = {
                x: pageX,
                y: pageY,
                width,
                height,
              };
            }
          });
        }
      }, 0);
    },
    []
  );

  const registerItemLayout = useCallback(
    (itemId: string, categoryId: string) => (e: LayoutChangeEvent) => {
      const { target } = e;
      setTimeout(() => {
        if (target) {
          target.measure((x, y, width, height, pageX, pageY) => {
            if (pageX !== undefined && pageY !== undefined) {
              itemLayouts.current[itemId] = {
                x: pageX,
                y: pageY,
                width,
                height,
                categoryId,
              };
            }
          });
        }
      }, 0);
    },
    []
  );

  // Helper functions
  const isDraggingItem = useCallback(
    (item: DragDropItem) =>
      dragState.isDragging &&
      dragState.draggedItem?.id === item.id &&
      dragState.draggedItem?.type === item.type,
    [dragState]
  );

  const getDragOverStyle = useCallback(
    (item: DragDropItem) => {
      const isOver = dragState.draggedOverItem?.id === item.id;
      return {
        backgroundColor: isOver ? "rgba(16,185,129,0.1)" : "transparent",
        borderColor: isOver ? "rgba(16,185,129,0.4)" : "transparent",
        borderWidth: isOver ? 2 : 0,
      };
    },
    [dragState]
  );

  const getCategoryDragOverStyle = useCallback(
    (categoryId: string) => {
      const isOver = dragState.draggedOverCategory === categoryId;
      return {
        backgroundColor: isOver ? "rgba(16,185,129,0.05)" : "transparent",
        transform: [{ scale: isOver ? 1.02 : 1 }],
      };
    },
    [dragState]
  );

  // Animated style for dragged items (makes them invisible while being dragged)
  const draggedAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: 0.3,
    };
  });

  return {
    dragState,
    createDragGesture,
    isDraggingItem,
    draggedAnimatedStyle,
    getDragOverStyle,
    getCategoryDragOverStyle,
    registerCategoryLayout,
    registerItemLayout,
    setDraggedOver,
  };
};
