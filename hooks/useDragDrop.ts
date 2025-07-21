// hooks/useDragDrop.ts
import { useState, useRef, useCallback } from 'react';
import { Animated, Vibration, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface DragDropItem {
  id: string;
  type: 'category' | 'trick';
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
  onDragEnd?: (item: DragDropItem, targetItem?: DragDropItem, targetCategory?: string) => void;
  onDragOver?: (item: DragDropItem) => void;
  enabled?: boolean;
}

export const useDragDrop = ({
  onDragStart,
  onDragEnd,
  onDragOver,
  enabled = true
}: UseDragDropProps) => {
  const [dragState, setDragState] = useState<DragDropState>({
    isDragging: false,
    draggedItem: null,
    draggedOverItem: null,
    draggedOverCategory: null
  });

  const dragAnimation = useRef(new Animated.ValueXY()).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const shadowAnimation = useRef(new Animated.Value(0)).current;
  const draggedItemRef = useRef<DragDropItem | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Start dragging
  const startDrag = useCallback((item: DragDropItem) => {
    if (!enabled) return;

    // Haptic feedback
    Vibration.vibrate(50);

    draggedItemRef.current = item;
    setDragState({
      isDragging: true,
      draggedItem: item,
      draggedOverItem: null,
      draggedOverCategory: null
    });

    // Animate scale and shadow
    Animated.parallel([
      Animated.spring(scaleAnimation, {
        toValue: 1.05,
        useNativeDriver: true,
        tension: 100,
        friction: 7
      }),
      Animated.timing(shadowAnimation, {
        toValue: 20,
        duration: 200,
        useNativeDriver: false
      })
    ]).start();

    onDragStart?.(item);
  }, [enabled, onDragStart, scaleAnimation, shadowAnimation]);

  // Update drag position
  const updateDragPosition = useCallback((x: number, y: number) => {
    dragAnimation.setValue({ x, y });
  }, [dragAnimation]);

  // Set item being dragged over
  const setDraggedOver = useCallback((item: DragDropItem | null, category?: string | null) => {
    setDragState(prev => ({
      ...prev,
      draggedOverItem: item,
      draggedOverCategory: category || null
    }));

    if (item) {
      onDragOver?.(item);
      // Light haptic feedback when hovering
      Vibration.vibrate(10);
    }
  }, [onDragOver]);

  // End dragging
  const endDrag = useCallback((targetItem?: DragDropItem, targetCategory?: string) => {
    if (!draggedItemRef.current) return;

    const draggedItem = draggedItemRef.current;

    // Animate back
    Animated.parallel([
      Animated.spring(dragAnimation, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
        tension: 100,
        friction: 7
      }),
      Animated.spring(scaleAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 7
      }),
      Animated.timing(shadowAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false
      })
    ]).start(() => {
      // Reset state after animation
      setDragState({
        isDragging: false,
        draggedItem: null,
        draggedOverItem: null,
        draggedOverCategory: null
      });
      draggedItemRef.current = null;
    });

    // Trigger layout animation for reordering
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        200,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );

          onDragEnd?.(draggedItem, targetItem || undefined, targetCategory || undefined);
  }, [dragAnimation, scaleAnimation, shadowAnimation, onDragEnd]);

  // Create gesture handler for an item
  const createDragGesture = useCallback((item: DragDropItem) => {
    if (!enabled) return Gesture.Tap();

    const longPressGesture = Gesture.LongPress()
      .minDuration(500)
      .onStart(() => {
        runOnJS(startDrag)(item);
      });

    const panGesture = Gesture.Pan()
      .activateAfterLongPress(500)
      .onUpdate((event) => {
        runOnJS(updateDragPosition)(event.translationX, event.translationY);
      })
      .onEnd(() => {
        const overItem = dragState.draggedOverItem || undefined;
        const overCategory = dragState.draggedOverCategory || undefined;
        runOnJS(endDrag)(overItem, overCategory);
      });

    return Gesture.Simultaneous(longPressGesture, panGesture);
  }, [enabled, startDrag, updateDragPosition, endDrag, dragState.draggedOverItem, dragState.draggedOverCategory]);

  // Get animated style for dragged item
  const getDraggedStyle = useCallback((item: DragDropItem) => {
    const isDragged = dragState.isDragging && dragState.draggedItem?.id === item.id;

    return {
      transform: [
        ...dragAnimation.getTranslateTransform(),
        { scale: isDragged ? scaleAnimation : 1 }
      ],
      zIndex: isDragged ? 1000 : 1,
      elevation: isDragged ? 10 : 0,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: isDragged ? shadowAnimation : 0
      },
      shadowOpacity: isDragged ? 0.3 : 0,
      shadowRadius: isDragged ? shadowAnimation : 0,
      opacity: isDragged ? 0.9 : 1
    };
  }, [dragState.isDragging, dragState.draggedItem, dragAnimation, scaleAnimation, shadowAnimation]);

  // Get style for items being dragged over
  const getDragOverStyle = useCallback((item: DragDropItem) => {
    const isOver = dragState.draggedOverItem?.id === item.id;
    
    return {
      backgroundColor: isOver ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
      borderColor: isOver ? 'rgba(16, 185, 129, 0.4)' : 'transparent',
      borderWidth: isOver ? 2 : 0,
      transform: [{ scale: isOver ? 0.98 : 1 }]
    };
  }, [dragState.draggedOverItem]);

  // Get style for categories being dragged over
  const getCategoryDragOverStyle = useCallback((categoryId: string) => {
    const isOver = dragState.draggedOverCategory === categoryId;
    
    return {
      backgroundColor: isOver ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
      borderColor: isOver ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.4)',
      borderWidth: isOver ? 2 : 1,
      transform: [{ scale: isOver ? 1.02 : 1 }]
    };
  }, [dragState.draggedOverCategory]);

  return {
    dragState,
    startDrag,
    endDrag,
    setDraggedOver,
    createDragGesture,
    getDraggedStyle,
    getDragOverStyle,
    getCategoryDragOverStyle,
    dragAnimation
  };
};