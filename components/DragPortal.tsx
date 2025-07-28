// components/DragPortal.tsx
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { View, StyleSheet } from "react-native";
import Animated, { AnimatedStyleProp } from "react-native-reanimated";

interface DragPortalContextType {
  setDraggedElement: (element: ReactNode | null) => void;
  setDraggedStyle: (style: AnimatedStyleProp<any>) => void;
}

const DragPortalContext = createContext<DragPortalContextType>({
  setDraggedElement: () => {},
  setDraggedStyle: () => {},
});

export const useDragPortal = () => useContext(DragPortalContext);

export const DragPortalProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [draggedElement, setDraggedElement] = useState<ReactNode | null>(null);
  const [draggedStyle, setDraggedStyle] = useState<AnimatedStyleProp<any>>({});

  const setDraggedElementCallback = useCallback((element: ReactNode | null) => {
    setDraggedElement(element);
  }, []);

  const setDraggedStyleCallback = useCallback(
    (style: AnimatedStyleProp<any>) => {
      setDraggedStyle(style);
    },
    []
  );

  return (
    <DragPortalContext.Provider
      value={{
        setDraggedElement: setDraggedElementCallback,
        setDraggedStyle: setDraggedStyleCallback,
      }}
    >
      <View style={styles.container}>{children}</View>
      {draggedElement && (
        <Animated.View
          style={[styles.portal, draggedStyle]}
          pointerEvents="none"
        >
          {draggedElement}
        </Animated.View>
      )}
    </DragPortalContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  portal: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 10000,
    elevation: 10000, // Para Android
  },
});
