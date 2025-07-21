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
} from "react-native-reanimated";

// Enable LayoutAnimation on Android (experimental)
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Tipos que usamos en todo el hook ---
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

/**
 * useDragDrop
 *
 * Hook que gestiona todo el drag&drop de categorías y trucos.
 * - Registra posiciones de headers de categorías para detectar colisiones.
 * - Expone gestos (Pan, LongPress) y estilos animados.
 * - Lanza callbacks JS en start, over y end.
 */
export const useDragDrop = ({
  onDragStart,
  onDragEnd,
  onDragOver,
  enabled = true,
}: UseDragDropProps) => {
  // Estado React para re-render cuando arrastramos
  const [dragState, setDragState] = useState<DragDropState>({
    isDragging: false,
    draggedItem: null,
    draggedOverItem: null,
    draggedOverCategory: null,
  });

  // Ref para guardar layouts de cada header de categoría
  const categoryLayouts = useRef<
    Record<string, { x: number; y: number; width: number; height: number }>
  >({});

  // Shared values de Reanimated para posición, escala y opacidad
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Shared values para IDs en worklets
  const draggedItemId = useSharedValue<string | null>(null);
  const draggedItemType = useSharedValue<"category" | "trick" | null>(null);
  const draggedOverItemId = useSharedValue<string | null>(null);
  const draggedOverCategoryId = useSharedValue<string | null>(null);

  // —————————————————————————————
  // 1) startDrag: inicia el arrastre
  // —————————————————————————————
  const startDrag = useCallback(
    (item: DragDropItem) => {
      console.log("🐾 startDrag:", item);
      if (!enabled) return;

      // Feedback háptico breve
      Vibration.vibrate(50);

      // Actualizamos estado React
      setDragState({
        isDragging: true,
        draggedItem: item,
        draggedOverItem: null,
        draggedOverCategory: null,
      });

      // Actualizamos shared values para worklet
      draggedItemId.value = item.id;
      draggedItemType.value = item.type;
      draggedOverItemId.value = null;
      draggedOverCategoryId.value = null;

      // Animación inicial: agrandar y hacer más transparente
      scale.value = withSpring(1.05, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(0.9, { duration: 200 });

      onDragStart?.(item);
    },
    [enabled, onDragStart, scale, opacity, draggedItemId, draggedItemType]
  );

  // —————————————————————————————
  // 2) setDraggedOver: llamado cuando detectamos colisión
  // —————————————————————————————
  const setDraggedOver = useCallback(
    (item: DragDropItem | null, category: string | null) => {
      console.log("🐾 setDraggedOver:", item, "categoria→", category);
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
    [onDragOver, draggedOverItemId, draggedOverCategoryId]
  );

  // —————————————————————————————
  // 3) endDrag: termina el arrastre y lanza callback
  // —————————————————————————————
  const endDrag = useCallback(
    (item: DragDropItem, targetItemId?: string, targetCategoryId?: string) => {
      console.log(
        "🐾 endDrag:",
        item,
        "targetItemId=",
        targetItemId,
        "targetCategory=",
        targetCategoryId
      );

      // Animaciones de regreso a posición original
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 200 });

      // Layout animation para reordenar suavemente
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          200,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity
        )
      );

      // Reset de estado tras la animación
      setTimeout(() => {
        setDragState({
          isDragging: false,
          draggedItem: null,
          draggedOverItem: null,
          draggedOverCategory: null,
        });
        draggedItemId.value = null;
        draggedItemType.value = null;
        draggedOverItemId.value = null;
        draggedOverCategoryId.value = null;
      }, 300);

      // Construimos el objeto DragDropItem para target si existe
      const targetItem = targetItemId
        ? { id: targetItemId, type: "trick" as const, data: {} }
        : undefined;

      onDragEnd?.(item, targetItem, targetCategoryId);
    },
    [
      translateX,
      translateY,
      scale,
      opacity,
      onDragEnd,
      draggedItemId,
      draggedItemType,
      draggedOverItemId,
      draggedOverCategoryId,
    ]
  );

  // Worklet que dispara endDrag en JS
  const endDragWorklet = useCallback(() => {
    "worklet";
    if (!draggedItemId.value || !draggedItemType.value) return;
    const draggedItem: DragDropItem = {
      id: draggedItemId.value,
      type: draggedItemType.value,
      data: {},
    };
    runOnJS(endDrag)(
      draggedItem,
      draggedOverItemId.value ?? undefined,
      draggedOverCategoryId.value ?? undefined
    );
  }, [
    endDrag,
    draggedItemId,
    draggedItemType,
    draggedOverItemId,
    draggedOverCategoryId,
  ]);

  // —————————————————————————————
  // 4) Detectar colisiones contra categorías
  // —————————————————————————————
  const lastCollisionCheck = useRef({
    x: 0,
    y: 0,
    category: null as string | null,
  });

  const checkCategoryCollision = useCallback(
    (absX: number, absY: number) => {
      // Throttle - solo verificar si el movimiento es significativo
      const dx = Math.abs(absX - lastCollisionCheck.current.x);
      const dy = Math.abs(absY - lastCollisionCheck.current.y);

      if (dx < 5 && dy < 5) return; // Ignorar movimientos pequeños

      lastCollisionCheck.current.x = absX;
      lastCollisionCheck.current.y = absY;

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

      // Solo actualizar si cambió la categoría
      if (foundCategory !== lastCollisionCheck.current.category) {
        lastCollisionCheck.current.category = foundCategory;
        runOnJS(setDraggedOver)(null, foundCategory);
      }
    },
    [setDraggedOver]
  );

  // —————————————————————————————
  // 5) Registrar el layout de cada header de categoría
  //    para usarlo en checkCategoryCollision
  // —————————————————————————————
  const registerCategoryLayout = useCallback(
    (categoryId: string) => (e: LayoutChangeEvent) => {
      e.target.measure((x, y, width, height, pageX, pageY) => {
        categoryLayouts.current[categoryId] = {
          x: pageX,
          y: pageY,
          width,
          height,
        };
        console.log(`📏 Layout registrado para ${categoryId}:`, {
          pageX,
          pageY,
          width,
          height,
        });
      });
    },
    []
  );

  // —————————————————————————————
  // 6) Crear gesture de drag (Pan) para ítems y categorías
  // —————————————————————————————
  const createDragGesture = useCallback(
    (item: DragDropItem) => {
      if (!enabled) return Gesture.Tap();

      return Gesture.Pan()
        .onBegin(() => {
          "worklet";
          console.log("🎯 Gesture onBegin");
        })
        .onStart(() => {
          "worklet";
          console.log("🎯 Gesture onStart");
          runOnJS(startDrag)(item);
        })
        .onUpdate((event) => {
          "worklet";
          translateX.value = event.translationX;
          translateY.value = event.translationY;

          // Log para debug
          if (event.translationX !== 0 || event.translationY !== 0) {
            console.log("🎯 Moving:", event.translationX, event.translationY);
          }

          // Solo verificar colisiones si hay movimiento significativo
          if (
            Math.abs(event.translationX) > 10 ||
            Math.abs(event.translationY) > 10
          ) {
            runOnJS(checkCategoryCollision)(event.absoluteX, event.absoluteY);
          }
        })
        .onEnd(() => {
          "worklet";
          console.log("🎯 Gesture onEnd");
          endDragWorklet();
        })
        .onFinalize(() => {
          "worklet";
          // Asegurar reset si se cancela
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
        })
        .shouldCancelWhenOutside(false)
        .enabled(enabled);
    },
    [
      enabled,
      startDrag,
      endDragWorklet,
      translateX,
      translateY,
      checkCategoryCollision,
    ]
  );

  // Reutilizamos createDragGesture también para categorías
  const createCategoryDragGesture = createDragGesture;

  // —————————————————————————————
  // 7) Estilo animado para el item arrastrado
  // —————————————————————————————
  const draggedAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
    zIndex: 1000,
    elevation: 10,
  }));

  // Helpers para estilo de "drag over"
  const isDraggingItem = useCallback(
    (item: DragDropItem) =>
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
        transform: [{ scale: isOver ? 0.98 : 1 }],
      };
    },
    [dragState]
  );
  const getCategoryDragOverStyle = useCallback(
    (categoryId: string) => {
      const isOver = dragState.draggedOverCategory === categoryId;
      return {
        backgroundColor: isOver ? "rgba(16,185,129,0.15)" : "transparent",
        borderColor: isOver ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.4)",
        borderWidth: isOver ? 2 : 1,
        transform: [{ scale: isOver ? 1.02 : 1 }],
      };
    },
    [dragState]
  );

  // —————————————————————————————
  // Devolvemos todo lo necesario para el componente
  // —————————————————————————————
  return {
    dragState,
    startDrag,
    endDrag,
    setDraggedOver,
    createDragGesture,
    createCategoryDragGesture,
    draggedAnimatedStyle,
    isDraggingItem,
    getDragOverStyle,
    getCategoryDragOverStyle,
    registerCategoryLayout,
  };
};
