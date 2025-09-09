import React, { useRef, useEffect, useCallback, memo, useState } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  Text,
  TouchableWithoutFeedback,
} from "react-native";
import { fontNames } from "../../app/_layout";

const { width: screenWidth } = Dimensions.get("window");

interface VideoProgressBarProps {
  duration: number;
  currentTime: number;
  visible?: boolean;
  onSeekStart?: () => void;
  onSeek?: (time: number) => void;
  onSeekEnd?: (time: number) => void;
   onBarInteraction?: () => void;
}

const VideoProgressBar = memo<VideoProgressBarProps>(
  ({
    duration,
    currentTime,
    visible = true,
    onSeekStart,
    onSeek,
    onSeekEnd,
    onBarInteraction,
  }) => {
    const thumbAnimation = useRef(new Animated.Value(1)).current;
    const barOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
    const progressBarWidth = screenWidth - 24;

    // Usar estado para el progreso
    const [progressPercent, setProgressPercent] = useState(0);
    const thumbPosition = useRef(new Animated.Value(0)).current;

    // Referencias para evitar re-renders
    const isDraggingRef = useRef(false);
    const progressBarRef = useRef<View>(null);

    // Animación de visibilidad
    useEffect(() => {
      Animated.timing(barOpacity, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, [visible, barOpacity]);

    // Actualización del progreso cuando no estamos arrastrando
    useEffect(() => {
      if (isDraggingRef.current) return;

      const progress =
        duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;

      setProgressPercent(progress);

      // Animar la posición del thumb suavemente
      Animated.timing(thumbPosition, {
        toValue: progress * progressBarWidth,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }, [currentTime, duration, progressBarWidth, thumbPosition]);

    // Función para manejar el toque directo en la barra
    const handleBarPress = useCallback(
      (evt: any) => {
        const locationX = evt.nativeEvent.locationX;
        const percentage = Math.max(
          0,
          Math.min(1, locationX / progressBarWidth)
        );
        const seekTime = percentage * duration;

        // Actualizar visual inmediatamente
        setProgressPercent(percentage);
        thumbPosition.setValue(percentage * progressBarWidth);

        // Notificar el cambio
        onSeek?.(seekTime);
        onSeekEnd?.(seekTime);
      },
      [duration, progressBarWidth, thumbPosition, onSeek, onSeekEnd]
    );

    // PanResponder para el arrastre
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,

        onPanResponderGrant: (evt) => {
          onBarInteraction?.(); // AÑADIR ESTA LÍNEA
          isDraggingRef.current = true;
          onSeekStart?.();

          // Animar el tamaño del thumb
          Animated.spring(thumbAnimation, {
            toValue: 1.5,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
          }).start();

          const locationX = evt.nativeEvent.locationX;
          const percentage = Math.max(
            0,
            Math.min(1, locationX / progressBarWidth)
          );
          const seekTime = percentage * duration;

          onSeek?.(seekTime);
          setProgressPercent(percentage);
          thumbPosition.setValue(percentage * progressBarWidth);
        },

        onPanResponderMove: (evt) => {
          const locationX = evt.nativeEvent.locationX;
          const percentage = Math.max(
            0,
            Math.min(1, locationX / progressBarWidth)
          );
          const seekTime = percentage * duration;

          onSeek?.(seekTime);
          setProgressPercent(percentage);
          thumbPosition.setValue(percentage * progressBarWidth);
        },

        onPanResponderRelease: (evt) => {
          isDraggingRef.current = false;

          // Restaurar tamaño del thumb
          Animated.spring(thumbAnimation, {
            toValue: 1,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
          }).start();

          const locationX = evt.nativeEvent.locationX;
          const percentage = Math.max(
            0,
            Math.min(1, locationX / progressBarWidth)
          );
          const seekTime = percentage * duration;
          onSeekEnd?.(seekTime);
        },
      })
    ).current;

    const formatTime = useCallback((seconds: number) => {
      const s = Math.max(0, Math.floor(seconds || 0));
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }, []);

    return (
      <Animated.View
        style={[styles.container, { opacity: barOpacity }]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
        </View>

        {/* Área táctil grande para capturar toques */}
        <TouchableWithoutFeedback onPress={handleBarPress}>
          <View style={styles.touchableArea}>
            {/* Área de arrastre con PanResponder */}
            <View
              ref={progressBarRef}
              style={styles.touchAreaContainer}
              {...panResponder.panHandlers}
            >
              <View style={styles.progressBarContainer}>
                {/* Barra de fondo */}
                <View style={styles.progressBarBackground} />

                {/* Barra de progreso con width calculado */}
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercent * 100}%`,
                    },
                  ]}
                />

                {/* Thumb animado */}
                <Animated.View
                  style={[
                    styles.thumbContainer,
                    {
                      transform: [
                        { translateX: thumbPosition },
                        { scale: thumbAnimation },
                      ],
                    },
                  ]}
                  pointerEvents="none"
                >
                  
                    <View style={styles.thumb} />
                  
                </Animated.View>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    );
  }
);

VideoProgressBar.displayName = "VideoProgressBar";

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  invisibleTouchArea: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 80, // Área táctil grande para facilitar el toque
    zIndex: 1,
  },
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timeContainer: {
    paddingHorizontal: 4,
    paddingBottom: 0,
  },
  timeText: {
    color: "white",
    fontSize: 12,
    fontFamily: fontNames.regular,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  touchableArea: {
    // Área táctil expandida
    paddingVertical: 20,
    marginVertical: -20,
  },
  touchAreaContainer: {
    // Contenedor para el PanResponder
    paddingVertical: 10,
  },
  progressBarContainer: {
    height: 3,
    justifyContent: "center",
    position: "relative",
  },
  progressBarBackground: {
    position: "absolute",
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    left: 0,
    right: 0,
    borderRadius: 1.5,
  },
  progressBarFill: {
    position: "absolute",
    height: 3,
    backgroundColor: "white",
    borderRadius: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  thumbContainer: {
    position: "absolute",
    width: 20,
    height: 20,
    marginLeft: -4,
    marginTop: -1,
    justifyContent: "center",
    alignItems: "center",
  },
  thumb: {
    width: 12,
    height: 12,
    borderRadius: 7,
    backgroundColor: "white",
    elevation: 5,
  },
});

export default VideoProgressBar;
