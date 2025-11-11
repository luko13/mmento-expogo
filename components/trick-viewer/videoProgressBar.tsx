import React, { useRef, useEffect, useCallback, memo, useState } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  Text,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fontNames } from "../../app/_layout";

const { width: screenWidth } = Dimensions.get("window");

interface VideoProgressBarProps {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  isUIVisible: boolean;
  onPlayPause: () => void;
  onToggleUI: () => void;
  onSeekStart?: () => void;
  onSeek?: (time: number) => void;
  onSeekEnd?: (time: number) => void;
  onBarInteraction?: () => void;
}

const VideoProgressBar = memo<VideoProgressBarProps>(
  ({
    duration,
    currentTime,
    isPlaying,
    isUIVisible,
    onPlayPause,
    onToggleUI,
    onSeekStart,
    onSeek,
    onSeekEnd,
    onBarInteraction,
  }) => {
    const thumbAnimation = useRef(new Animated.Value(1)).current;

    // Usar estado para el progreso
    const [progressPercent, setProgressPercent] = useState(0);
    const [progressBarWidth, setProgressBarWidth] = useState(screenWidth - 140);
    const thumbPosition = useRef(new Animated.Value(0)).current;

    // Referencias para evitar re-renders
    const isDraggingRef = useRef(false);
    const progressBarRef = useRef<View>(null);
    const progressBarWidthRef = useRef(progressBarWidth);
    const durationRef = useRef(duration);

    // Actualizar refs cuando cambien los valores
    useEffect(() => {
      progressBarWidthRef.current = progressBarWidth;
    }, [progressBarWidth]);

    useEffect(() => {
      durationRef.current = duration;
    }, [duration]);

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
          Math.min(1, locationX / progressBarWidthRef.current)
        );
        const seekTime = percentage * durationRef.current;

        // Actualizar visual inmediatamente
        setProgressPercent(percentage);
        thumbPosition.setValue(percentage * progressBarWidthRef.current);

        // Notificar el cambio
        onSeek?.(seekTime);
        onSeekEnd?.(seekTime);
      },
      [thumbPosition, onSeek, onSeekEnd]
    );

    // PanResponder para el arrastre
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,

        onPanResponderGrant: (evt) => {
          onBarInteraction?.();
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
            Math.min(1, locationX / progressBarWidthRef.current)
          );
          const seekTime = percentage * durationRef.current;

          onSeek?.(seekTime);
          setProgressPercent(percentage);
          thumbPosition.setValue(percentage * progressBarWidthRef.current);
        },

        onPanResponderMove: (evt) => {
          const locationX = evt.nativeEvent.locationX;
          const percentage = Math.max(
            0,
            Math.min(1, locationX / progressBarWidthRef.current)
          );
          const seekTime = percentage * durationRef.current;

          onSeek?.(seekTime);
          setProgressPercent(percentage);
          thumbPosition.setValue(percentage * progressBarWidthRef.current);
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
            Math.min(1, locationX / progressBarWidthRef.current)
          );
          const seekTime = percentage * durationRef.current;
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
      <View style={styles.container}>
        {/* Botón Play/Pausa */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onPlayPause}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={24}
            color="white"
          />
        </TouchableOpacity>

        {/* Contenedor central: barra + tiempo */}
        <View style={styles.centerContainer}>
          {/* Área táctil grande para capturar toques */}
          <TouchableWithoutFeedback onPress={handleBarPress}>
            <View style={styles.touchableArea}>
              {/* Área de arrastre con PanResponder */}
              <View
                ref={progressBarRef}
                style={styles.touchAreaContainer}
                {...panResponder.panHandlers}
              >
                <View
                  style={styles.progressBarContainer}
                  onLayout={(e) => {
                    const { width } = e.nativeEvent.layout;
                    setProgressBarWidth(width);
                  }}
                >
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

          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </Text>
          </View>
        </View>

        {/* Botón Toggle UI (Ojo) */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onToggleUI}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isUIVisible ? "eye" : "eye-off"}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>
    );
  }
);

VideoProgressBar.displayName = "VideoProgressBar";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  centerContainer: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: "center",
  },
  timeContainer: {
    paddingHorizontal: 4,
    paddingTop: 2,
    alignItems: "center",
    marginTop: -4,
  },
  timeText: {
    color: "white",
    fontSize: 11,
    fontFamily: fontNames.regular,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  touchableArea: {
    // Área táctil expandida
    paddingVertical: 12,
    marginVertical: -12,
  },
  touchAreaContainer: {
    // Contenedor para el PanResponder
    paddingVertical: 8,
  },
  progressBarContainer: {
    height: 4,
    justifyContent: "center",
    position: "relative",
  },
  progressBarBackground: {
    position: "absolute",
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    left: 0,
    right: 0,
    borderRadius: 2,
  },
  progressBarFill: {
    position: "absolute",
    height: 4,
    backgroundColor: "white",
    borderRadius: 2,
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
    marginTop: -2,
    justifyContent: "center",
    alignItems: "center",
  },
  thumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "white",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
});

export default VideoProgressBar;
