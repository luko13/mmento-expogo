// components/DragDropIndicator.tsx
import React from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

interface Props {
  isActive: boolean;
  position: 'above' | 'below';
}

export const DragDropIndicator: React.FC<Props> = ({ isActive, position }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const height = withSpring(isActive ? 60 : 0);
    const opacity = withSpring(isActive ? 1 : 0);
    
    return {
      height,
      opacity,
      marginTop: position === 'above' ? 0 : -60,
      marginBottom: position === 'below' ? 0 : -60,
    };
  });

  return (
    <Animated.View style={[animatedStyle, {
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      borderRadius: 8,
      marginHorizontal: 16,
    }]} />
  );
};