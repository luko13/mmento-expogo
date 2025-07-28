// components/DraggableCategory.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  withSpring,
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
  isDragging: boolean;
  draggedItemId: string | null;
  hoveredIndex: number | null;
  onMoreOptions: () => void;
  onToggleExpand: () => void;
}

export const DraggableCategory: React.FC<DraggableCategoryProps> = ({
  item,
  index,
  onDragStart,
  isDragging,
  draggedItemId,
  hoveredIndex,
  onMoreOptions,
  onToggleExpand,
}) => {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const itemHeight = 68;

  React.useEffect(() => {
    if (!isDragging || !draggedItemId || hoveredIndex === null) {
      translateY.value = withSpring(0);
      return;
    }

    if (draggedItemId === item.id) {
      scale.value = withTiming(0.001);
      return;
    } else {
      scale.value = withTiming(1);
    }

    if (hoveredIndex !== null && index >= hoveredIndex) {
      translateY.value = withSpring(itemHeight);
    } else {
      translateY.value = withSpring(0);
    }
  }, [isDragging, draggedItemId, hoveredIndex, index, item.id, itemHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: draggedItemId === item.id ? 0 : 1,
  }));

  const gesture = Gesture.LongPress()
    .minDuration(200)
    .onStart(() => {
      "worklet";
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      runOnJS(onDragStart)(item.id, index);
    });

  const handleMoreOptions = (e: any) => {
    e.stopPropagation();
    onMoreOptions();
  };

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[animatedStyle, { marginBottom: 8, paddingHorizontal: 16 }]}
      >
        <TouchableOpacity onPress={onToggleExpand} activeOpacity={0.7}>
          <StyledView className="flex-row justify-between items-center bg-[white]/10 px-3 border border-white/40 rounded-lg mb-2">
            <StyledView className="flex-row items-center flex-1 py-3">
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
