// hooks/useSimpleDragDrop.ts
import { useState, useCallback } from "react";
import { Vibration } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

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

interface UseSimpleDragDropProps {
  onDragEnd?: (draggedItem: DragDropItem, targetCategory?: string) => void;
  enabled?: boolean;
}

export const useSimpleDragDrop = ({
  onDragEnd,
  enabled = true,
}: UseSimpleDragDropProps) => {
  const [draggedOverCategory, setDraggedOverCategory] = useState<string | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DragDropItem | null>(null);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Create drag state object for compatibility
  const dragState: DragDropState = {
    isDragging,
    draggedItem,
    draggedOverItem: null,
    draggedOverCategory,
  };

  // Create a simple drag gesture
  const createDragGesture = useCallback(
    (item: DragDropItem) => {
      if (!enabled) {
        return Gesture.Pan().enabled(false);
      }

      return Gesture.Pan()
        .onStart(() => {
          "worklet";
          scale.value = withSpring(0.95);
          opacity.value = withSpring(0.7);
          runOnJS(Vibration.vibrate)(50);
          runOnJS(setIsDragging)(true);
          runOnJS(setDraggedItem)(item);
        })
        .onEnd(() => {
          "worklet";
          scale.value = withSpring(1);
          opacity.value = withSpring(1);

          runOnJS(() => {
            const targetCategory = draggedOverCategory;
            setIsDragging(false);
            setDraggedItem(null);
            setDraggedOverCategory(null);

            if (targetCategory && targetCategory !== item.categoryId) {
              onDragEnd?.(item, targetCategory);
            }
          })();
        })
        .enabled(enabled);
    },
    [enabled, onDragEnd, draggedOverCategory, scale, opacity]
  );

  // Animated style for dragging items
  const draggedAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Style for drag over
  const getCategoryDragOverStyle = useCallback(
    (categoryId: string) => ({
      backgroundColor:
        draggedOverCategory === categoryId
          ? "rgba(16,185,129,0.1)"
          : "transparent",
      borderWidth: draggedOverCategory === categoryId ? 2 : 0,
      borderColor: "rgba(16,185,129,0.4)",
    }),
    [draggedOverCategory]
  );

  // Dummy functions for compatibility
  const isDraggingItem = useCallback(
    (item: DragDropItem) => {
      return isDragging && draggedItem?.id === item.id;
    },
    [isDragging, draggedItem]
  );

  const getDragOverStyle = useCallback(() => ({}), []);

  const registerCategoryLayout = useCallback(() => () => {}, []);
  const registerItemLayout = useCallback(() => () => {}, []);
  const setDraggedOver = useCallback(() => {}, []);

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
    setDraggedOverCategory,
    isDragging,
  };
};
