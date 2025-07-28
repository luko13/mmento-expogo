// hooks/useAutoScroll.ts
import { useRef, useCallback, useEffect } from "react";
import { FlatList, Dimensions } from "react-native";
import {
  useSharedValue,
  useAnimatedReaction,
  runOnJS,
  SharedValue,
} from "react-native-reanimated";

export const useAutoScroll = (
  flatListRef: React.RefObject<FlatList>,
  dragY: SharedValue<number>,
  isDragging: boolean
) => {
  const scrollInterval = useRef<NodeJS.Timeout | null>(null);
  const currentOffset = useRef(0);

  const startScroll = useCallback(
    (direction: "up" | "down") => {
      if (scrollInterval.current) return;

      scrollInterval.current = setInterval(() => {
        const scrollAmount = direction === "up" ? -20 : 20;
        currentOffset.current += scrollAmount;

        flatListRef.current?.scrollToOffset({
          offset: Math.max(0, currentOffset.current),
          animated: false,
        });
      }, 50);
    },
    [flatListRef]
  );

  const stopScroll = useCallback(() => {
    if (scrollInterval.current) {
      clearInterval(scrollInterval.current);
      scrollInterval.current = null;
    }
  }, []);

  // Reaccionar a cambios en la posición Y
  useAnimatedReaction(
    () => dragY.value,
    (currentY) => {
      if (!isDragging) {
        runOnJS(stopScroll)();
        return;
      }

      const EDGE_THRESHOLD = 100;
      const screenHeight = Dimensions.get("window").height;

      if (currentY < EDGE_THRESHOLD) {
        runOnJS(startScroll)("up");
      } else if (currentY > screenHeight - EDGE_THRESHOLD) {
        runOnJS(startScroll)("down");
      } else {
        runOnJS(stopScroll)();
      }
    }
  );

  useEffect(() => {
    return () => {
      stopScroll();
    };
  }, [stopScroll]);

  return { startScroll, stopScroll };
};
