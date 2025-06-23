import React, { useState, useRef, ReactNode, useEffect } from 'react';
import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  Animated,
  Platform,
  ViewStyle,
  TextStyle,
  Dimensions,
} from 'react-native';
import { fontNames } from '../../app/_layout';

interface CustomTooltipProps {
  children: ReactNode;
  text: string;
  backgroundColor?: string;
  textColor?: string;
  autoHideDuration?: number; // Duración en milisegundos antes de ocultar automáticamente
}

interface TooltipPosition {
  x: number;
  y: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOOLTIP_HEIGHT = 45; // Altura aproximada del tooltip
const TOOLTIP_WIDTH = 150; // Ancho del tooltip
const MARGIN = 10; // Margen desde los bordes de la pantalla

// Componente de Tooltip personalizado
const CustomTooltip: React.FC<CustomTooltipProps> = ({ 
  children, 
  text, 
  backgroundColor = 'rgba(0, 0, 0, 0.9)', 
  textColor = 'white',
  autoHideDuration = 3000 // 3 segundos por defecto
}) => {
  const [visible, setVisible] = useState<boolean>(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ x: 0, y: 0 });
  const [adjustedPosition, setAdjustedPosition] = useState<TooltipPosition>({ x: 0, y: 0 });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const touchableRef = useRef<View>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Auto-ocultar después del tiempo especificado
  useEffect(() => {
    if (visible && autoHideDuration > 0) {
      hideTimeoutRef.current = setTimeout(() => {
        hideTooltip();
      }, autoHideDuration);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [visible, autoHideDuration]);

  const calculateAdjustedPosition = (pageX: number, pageY: number, elementWidth: number): TooltipPosition => {
    let adjustedX = pageX + elementWidth / 2 - TOOLTIP_WIDTH / 2;
    let adjustedY = pageY - TOOLTIP_HEIGHT - 15; // 15px encima del elemento

    // Ajustar posición horizontal si se sale de la pantalla
    if (adjustedX < MARGIN) {
      adjustedX = MARGIN;
    } else if (adjustedX + TOOLTIP_WIDTH > SCREEN_WIDTH - MARGIN) {
      adjustedX = SCREEN_WIDTH - TOOLTIP_WIDTH - MARGIN;
    }

    // Si el tooltip se sale por arriba, mostrarlo debajo del elemento
    if (adjustedY < MARGIN) {
      adjustedY = pageY + elementWidth + 15; // 15px debajo del elemento
    }

    return { x: adjustedX, y: adjustedY };
  };

  const showTooltip = (): void => {
    // Limpiar timeout anterior si existe
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    if (touchableRef.current) {
      touchableRef.current.measure((
        x: number, 
        y: number, 
        width: number, 
        height: number, 
        pageX: number, 
        pageY: number
      ) => {
        // Calcular posición base
        const baseX = pageX + width / 2;
        const baseY = pageY;
        
        // Calcular posición ajustada para mantener en pantalla
        const adjusted = calculateAdjustedPosition(pageX, pageY, width);
        
        setTooltipPosition({
          x: baseX,
          y: baseY,
        });
        
        setAdjustedPosition(adjusted);
        
        setVisible(true);
        
        // Animación combinada de fade y scale
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  };

  const hideTooltip = (): void => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  };

  const tooltipStyle: Animated.AnimatedProps<ViewStyle> = {
    position: 'absolute',
    backgroundColor,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    left: adjustedPosition.x,
    top: adjustedPosition.y,
    transform: [
      { scale: scaleAnim },
    ],
    opacity: fadeAnim,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: TOOLTIP_WIDTH,
    alignItems: 'center',
  };

  const textStyle: TextStyle = {
    color: textColor,
    fontSize: 14,
    fontFamily: fontNames.light,
    textAlign: 'center',
    includeFontPadding: false,
  };

  // Calcular la posición del triángulo
  const triangleLeftPosition = tooltipPosition.x - adjustedPosition.x - 8;
  const isTooltipBelow = adjustedPosition.y > tooltipPosition.y;

  const triangleStyle: ViewStyle = {
    position: 'absolute',
    bottom: isTooltipBelow ? undefined : -8,
    top: isTooltipBelow ? -8 : undefined,
    left: triangleLeftPosition,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: isTooltipBelow ? 0 : 8,
    borderBottomWidth: isTooltipBelow ? 8 : 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: isTooltipBelow ? 'transparent' : backgroundColor,
    borderBottomColor: isTooltipBelow ? backgroundColor : 'transparent',
  };

  return (
    <>
      <TouchableOpacity
        ref={touchableRef}
        onPress={showTooltip}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>

      <Modal
        transparent
        visible={visible}
        onRequestClose={hideTooltip}
        animationType="none"
        statusBarTranslucent
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={hideTooltip}
        >
          <Animated.View style={tooltipStyle}>
            <Text style={textStyle}>
              {text}
            </Text>
            {/* Triángulo que apunta al elemento */}
            <View style={triangleStyle} />
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default CustomTooltip;