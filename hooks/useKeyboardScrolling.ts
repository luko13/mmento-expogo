// hooks/useKeyboardScrolling.ts
import { useState, useEffect, useCallback, RefObject } from "react";
import { Keyboard, ScrollView, View, Dimensions, Platform } from "react-native";

interface UseKeyboardScrollingOptions {
  headerHeight?: number;
  bottomHeight?: number;
  scrollDelay?: number;
  defaultKeyboardHeight?: number;
}

export const useKeyboardScrolling = (
  scrollViewRef: RefObject<ScrollView | null>,
  inputRef: RefObject<View | null>,
  options: UseKeyboardScrollingOptions = {}
) => {
  const {
    headerHeight = 120,
    bottomHeight = 100,
    scrollDelay = 300,
    defaultKeyboardHeight = 300,
  } = options;

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Listener del teclado
  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // Función para hacer scroll al input
  const scrollToInput = useCallback(() => {
    setTimeout(() => {
      if (inputRef.current && scrollViewRef.current) {
        inputRef.current.measureLayout(
          scrollViewRef.current as any,
          (x, y, width, height) => {
            const screenHeight = Dimensions.get("window").height;
            const keyboardSpace = keyboardHeight || defaultKeyboardHeight;
            const visibleHeight = screenHeight - keyboardSpace - headerHeight - bottomHeight;
            const targetY = y - visibleHeight / 2 + height / 2;

            scrollViewRef.current?.scrollTo({
              y: Math.max(0, targetY),
              animated: true,
            });
          },
          () => console.log("Failed to measure layout")
        );
      }
    }, scrollDelay);
  }, [keyboardHeight, inputRef, scrollViewRef, headerHeight, bottomHeight, scrollDelay, defaultKeyboardHeight]);

  return {
    keyboardHeight,
    scrollToInput,
  };
};
