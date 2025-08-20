// components/CategoryDropIndicator.tsx
import React from "react";
import { View, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface CategoryDropIndicatorProps {
  isVisible: boolean;
  index: number; // <- lo dejas aunque no se use; TS feliz y útil para logs
}

export const CategoryDropIndicator: React.FC<CategoryDropIndicatorProps> = ({
  isVisible,
  index,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const height = withSpring(isVisible ? 6 : 0, {
      damping: 20,
      stiffness: 300,
    });
    const opacity = withTiming(isVisible ? 1 : 0, { duration: 160 });
    const scale = withSpring(isVisible ? 1 : 0.98, {
      damping: 15,
      stiffness: 300,
    });

    return {
      height,
      opacity,
      transform: [{ scaleX: scale }],
      marginVertical: isVisible ? 6 : 0,
    };
  });

  return (
    <Animated.View
      // Línea/slot de drop
      style={[
        animatedStyle,
        {
          backgroundColor: "#10b981",
          borderRadius: 3,
          marginHorizontal: 24,
          overflow: "hidden",
          // 👇 asegúrate de estar por encima del DragOverlay
          zIndex: 10050,
          ...(Platform.OS === "android" ? { elevation: 12 } : {}),
        },
      ]}
    >
      {/* brillo interior suave */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(255,255,255,0.28)",
        }}
      />
    </Animated.View>
  );
};
