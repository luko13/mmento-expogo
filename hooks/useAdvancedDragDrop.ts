// hooks/useAdvancedDragDrop.ts
import { useState, useCallback, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';

interface Position {
  x: number;
  y: number;
}

interface DragItem {
  id: string;
  type: 'category' | 'trick';
  categoryId?: string;
  data: any;
  originalPosition: Position;
}

export const useAdvancedDragDrop = ({
  enabled = true,
  onDragEnd,
}: {
  enabled?: boolean;
  onDragEnd?: (draggedItem: DragItem, dropPosition: Position) => void;
}) => {
  // Estado del item siendo arrastrado
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Posiciones animadas
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  
  // Almacenar las posiciones de todos los elementos
  const itemPositions = useRef<Map<string, Position & { height: number }>>(new Map());
  
  // Registrar la posición de un elemento
  const registerItemPosition = useCallback((itemId: string, position: Position & { height: number }) => {
    itemPositions.current.set(itemId, position);
  }, []);
  
  // Crear el gesto de arrastre
  const createDragGesture = useCallback((item: DragItem) => {
    if (!enabled) return Gesture.Pan().enabled(false);
    
    return Gesture.Pan()
      .onStart(() => {
        'worklet';
        scale.value = withSpring(1.05);
        opacity.value = withSpring(0.8);
        
        runOnJS(() => {
          setIsDragging(true);
          setDraggedItem(item);
        })();
      })
      .onChange((event) => {
        'worklet';
        translateX.value = event.translationX;
        translateY.value = event.translationY;
      })
      .onEnd(() => {
        'worklet';
        const dropX = item.originalPosition.x + translateX.value;
        const dropY = item.originalPosition.y + translateY.value;
        
        // Volver a la posición original con animación
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
        
        runOnJS(() => {
          setIsDragging(false);
          onDragEnd?.(item, { x: dropX, y: dropY });
          setDraggedItem(null);
        })();
      })
      .minDistance(10)
      .shouldCancelWhenOutside(false);
  }, [enabled, onDragEnd]);
  
  // Estilo animado para el elemento siendo arrastrado
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
    zIndex: isDragging ? 1000 : 1,
  }));
  
  // Detectar sobre qué elemento estamos
  const findDropTarget = useCallback((dropPosition: Position): string | null => {
    for (const [itemId, pos] of itemPositions.current.entries()) {
      if (
        dropPosition.x >= pos.x &&
        dropPosition.x <= pos.x + 100 && // Asumiendo ancho fijo, ajustar según necesidad
        dropPosition.y >= pos.y &&
        dropPosition.y <= pos.y + pos.height
      ) {
        return itemId;
      }
    }
    return null;
  }, []);
  
  return {
    createDragGesture,
    animatedStyle,
    isDragging,
    draggedItem,
    registerItemPosition,
    findDropTarget,
  };
};