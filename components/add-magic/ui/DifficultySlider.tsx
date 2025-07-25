"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  LayoutChangeEvent,
  TouchableWithoutFeedback,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import Slider from "@react-native-community/slider";
import { fontNames } from "../../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledSlider = styled(Slider);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTouchableWithoutFeedback = styled(TouchableWithoutFeedback);

interface DifficultySliderProps {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export default function DifficultySlider({
  value = null,
  onChange,
  min = 1,
  max = 10,
  step = 1,
}: DifficultySliderProps) {
  const { t } = useTranslation();
  const [hasUserInteracted, setHasUserInteracted] = useState<boolean>(
    value !== null
  );
  const [sliderValue, setSliderValue] = useState<number>(value || 5); // Valor visual por defecto 5
  const [sliderWidth, setSliderWidth] = useState(0);
  const [paddingHorizontal, setPaddingHorizontal] = useState(15); // Default padding
  const containerRef = useRef<View>(null);
  const sliderRef = useRef<Slider>(null);

  // Cambiar el valor del slider cuando cambia el valor externamente
  useEffect(() => {
    if (value !== null) {
      setSliderValue(value);
      setHasUserInteracted(true);
    }
  }, [value]);

  // Calcular color dependiendo de la dificultad
  const getDifficultyColor = (value: number) => {
    if (!hasUserInteracted) return "rgba(255, 255, 255, 0.3)";
    return "#ffffffc3"; // Siempre blanco cuando ha interactuado
  };

  // Gestión del cambio de valor del slider
  const handleValueChange = (newValue: number) => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }
    setSliderValue(newValue);
    onChange(newValue);
  };

  // Función general para manejar toques en cualquier parte del componente
  const handleTouchAnywhere = (x: number) => {
    if (sliderWidth <= 0) return;

    // Activar interacción si es la primera vez
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }

    // Calculamos qué porcentaje del slider se ha tocado
    const trackWidth = sliderWidth - paddingHorizontal * 2;

    // Ajustamos el x para tener en cuenta el padding
    const adjustedX = Math.max(0, Math.min(x - paddingHorizontal, trackWidth));

    // Calculamos el valor correspondiente
    const percentage = adjustedX / trackWidth;
    const newValue = Math.round((percentage * (max - min) + min) / step) * step;
    const boundedValue = Math.max(min, Math.min(max, newValue));

    // Actualizamos el valor
    setSliderValue(boundedValue);
    onChange(boundedValue);

    // Forzar la actualización visual del slider (principalmente para iOS)
    if (sliderRef.current) {
      // @ts-ignore - ignoramos el error de TypeScript porque sabemos que funciona
      sliderRef.current.setNativeProps({ value: boundedValue });
    }
  };

  // Gestión del layout del slider
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setSliderWidth(width);
    // Padding default
    setPaddingHorizontal(15);
  };

  // Generar los indicadores de step
  const renderStepIndicators = () => {
    if (sliderWidth <= 0) return null;

    const indicators = [];
    const stepsCount = (max - min) / step + 1;

    // Substraer el padding horizontal para calcular el ancho del track
    const trackWidth = sliderWidth - paddingHorizontal * 2;

    for (let i = 0; i < stepsCount; i++) {
      const value = min + i * step;

      // Calcular la posición relativa dentro del track
      const positionWithinTrack = (i / (stepsCount - 1)) * trackWidth;

      // Añadir el padding a la izquierda para tener el total
      const positionAbsolute = paddingHorizontal + positionWithinTrack;

      // Convertir el porcentaje el ancho total del slider
      const positionPercent = (positionAbsolute / sliderWidth) * 100;

      indicators.push(
        <StyledView
          key={`step-${i}`}
          className="absolute top-8" // Position below the slider
          style={{
            left: `${positionPercent}%` as any,
            transform: [{ translateX: -1 }],
            alignItems: "center",
          }}
        >
          <StyledView
            className={`h-0.5 w-0.5 ${
              hasUserInteracted ? "bg-white/30" : "bg-white/15"
            } mb-1`}
          />
          <StyledText
            className={
              hasUserInteracted
                ? "text-white/70 text-xs"
                : "text-white/30 text-xs"
            }
            style={{
              fontFamily: fontNames.light,
              fontSize: 12,
              includeFontPadding: false,
            }}
          >
            {value}
          </StyledText>
        </StyledView>
      );
    }

    return indicators;
  };

  return (
    <StyledTouchableWithoutFeedback
      onPress={(event) => {
        // @ts-ignore - Sabemos que nativeEvent.locationX existe
        const x = event.nativeEvent.locationX;
        handleTouchAnywhere(x);
      }}
    >
      <StyledView
        className="w-full pb-4" // Increased bottom padding for indicators
        ref={containerRef}
        onLayout={handleLayout}
      >
        {/* Texto indicador cuando no se ha interactuado */}
        {!hasUserInteracted && (
          <StyledView className="absolute top-0 left-0 right-0 items-center justify-center z-20 pointer-events-none">
            <StyledText
              className="text-white/50 text-sm"
              style={{
                fontFamily: fontNames.light,
                fontSize: 14,
                includeFontPadding: false,
              }}
            >
              {t("tapToSetDifficulty", "Toca para establecer dificultad")}
            </StyledText>
          </StyledView>
        )}

        {/* Todo el componente es táctil -> TouchableWithoutFeedback que lo envuelve */}
        <StyledView className="w-full relative">
          <StyledSlider
            ref={sliderRef}
            className="z-10"
            value={sliderValue}
            minimumValue={min}
            maximumValue={max}
            step={step}
            onValueChange={handleValueChange}
            minimumTrackTintColor={getDifficultyColor(sliderValue)}
            maximumTrackTintColor={
              hasUserInteracted
                ? "rgba(255, 255, 255, 0.2)"
                : "rgba(255, 255, 255, 0.1)"
            }
            thumbTintColor={
              hasUserInteracted
                ? getDifficultyColor(sliderValue)
                : "rgba(255, 255, 255, 0.3)"
            }
            style={{
              height: 30,
              opacity: hasUserInteracted ? 1 : 0.5,
            }}
          />

          {/* Marcadores de posición */}
          <StyledView className="w-full h-24 absolute top-0 left-0 right-0 pointer-events-none">
            {/* Indicadores de step - ahora son solo visuales, no manejamos eventos en ellos */}
            {renderStepIndicators()}
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledTouchableWithoutFeedback>
  );
}
