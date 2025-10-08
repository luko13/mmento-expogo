import React, { useEffect, useRef, useCallback } from "react";
import { Animated, Text } from "react-native";
import { fontNames } from "../../app/_layout";

interface BlinkingCursorProps {
  visible: boolean;
  color?: string;
  fontSize?: number;
  style?: any;
}

const BlinkingCursor: React.FC<BlinkingCursorProps> = ({
  visible,
  color = "#ffffff",
  fontSize = 16,
  style,
}) => {
  const cursorOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const startBlinking = useCallback(() => {
    loopRef.current?.stop?.();
    cursorOpacity.setValue(1);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 530,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 530,
          useNativeDriver: true,
        }),
      ])
    );

    loopRef.current = animation;
    animation.start();
  }, [cursorOpacity]);

  const stopBlinking = useCallback(() => {
    loopRef.current?.stop?.();
    cursorOpacity.setValue(0);
  }, [cursorOpacity]);

  // Efecto principal que maneja la animación
  useEffect(() => {
    if (visible) {
      startBlinking();
    } else {
      stopBlinking();
    }

    return () => {
      loopRef.current?.stop?.();
    };
  }, [visible, startBlinking, stopBlinking]);

  return (
    <Animated.Text
      style={[
        {
          opacity: cursorOpacity,
          color,
          fontFamily: fontNames.medium,
          includeFontPadding: false,
          fontSize,
          lineHeight: fontSize + 4,
        },
        style,
      ]}
    >
      |
    </Animated.Text>
  );
};

export default BlinkingCursor;
