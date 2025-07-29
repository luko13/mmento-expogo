// components/DropIndicator.tsx
import React from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  SharedValue,
} from 'react-native-reanimated';

interface DropIndicatorProps {
  isActive: boolean;
  isHovered: boolean;
  position: 'above' | 'below' | 'inside';
  height?: number;
}

export const DropIndicator: React.FC<DropIndicatorProps> = ({
  isActive,
  isHovered,
  position,
  height = 4,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const shouldShow = isActive && isHovered;
    
    const animatedHeight = withSpring(shouldShow ? height : 0, {
      damping: 20,
      stiffness: 300,
    });
    
    const animatedOpacity = withTiming(shouldShow ? 1 : 0, {
      duration: 200,
    });

    const backgroundColor = isHovered 
      ? 'rgba(16, 185, 129, 0.8)' // Verde esmeralda cuando está hover
      : 'rgba(255, 255, 255, 0.3)'; // Blanco tenue cuando no

    return {
      height: animatedHeight,
      opacity: animatedOpacity,
      backgroundColor,
      marginVertical: position === 'inside' ? 4 : 0,
      marginTop: position === 'above' ? -2 : 0,
      marginBottom: position === 'below' ? -2 : 0,
    };
  });

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          borderRadius: 2,
          marginHorizontal: 16,
          overflow: 'hidden',
        },
      ]}
    >
      {/* Efecto de brillo animado */}
      {isHovered && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          }}
        />
      )}
    </Animated.View>
  );
};

// Componente para el indicador de categoría expandible
export const CategoryDropZone: React.FC<{
  isActive: boolean;
  isHovered: boolean;
  isExpanded: boolean;
}> = ({ isActive, isHovered, isExpanded }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const shouldShow = isActive && isHovered && !isExpanded;
    
    const scale = withSpring(shouldShow ? 1 : 0.8, {
      damping: 15,
      stiffness: 300,
    });
    
    const opacity = withTiming(shouldShow ? 1 : 0, {
      duration: 200,
    });

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  if (isExpanded) return null;

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: 'absolute',
          right: 50,
          top: '50%',
          marginTop: -12,
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: 'rgba(16, 185, 129, 0.5)',
        },
      ]}
    >
      <Animated.Text
        style={{
          color: 'rgba(16, 185, 129, 1)',
          fontSize: 12,
          fontWeight: '600',
        }}
      >
        Drop to expand
      </Animated.Text>
    </Animated.View>
  );
};