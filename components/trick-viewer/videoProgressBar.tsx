import React, { useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  Text,
} from "react-native";
import { fontNames } from "../../app/_layout";

const { width: screenWidth } = Dimensions.get("window");

interface VideoProgressBarProps {
  // ⬇️ Componente controlado por el padre
  duration: number; // duración total en segundos
  currentTime: number; // tiempo actual en segundos
  visible?: boolean;

  // callbacks de interacción
  onSeekStart?: () => void;
  onSeek?: (time: number) => void; // mientras arrastras
  onSeekEnd?: (time: number) => void; // al soltar
}

const VideoProgressBar: React.FC<VideoProgressBarProps> = ({
  duration,
  currentTime,
  visible = true,
  onSeekStart,
  onSeek,
  onSeekEnd,
}) => {
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const thumbAnimation = useRef(new Animated.Value(1)).current;
  const barOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const progressBarWidth = screenWidth - 24; // 12px de margen por lado

  // anima visibilidad (solo depende de visible)
  useEffect(() => {
    Animated.timing(barOpacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  // anima avance (derivado de props)
  useEffect(() => {
    const pct =
      duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
    progressAnimation.setValue(pct);
  }, [currentTime, duration, progressAnimation]);

  // PanResponder (no muta estado interno, solo callbacks + animaciones)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        onSeekStart?.();

        Animated.spring(thumbAnimation, {
          toValue: 1.5,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }).start();

        const touchX = evt.nativeEvent.locationX;
        const percentage = Math.max(0, Math.min(1, touchX / progressBarWidth));
        const seekTime = percentage * (duration || 0);
        onSeek?.(seekTime);
      },

      onPanResponderMove: (evt) => {
        const touchX = evt.nativeEvent.locationX;
        const percentage = Math.max(0, Math.min(1, touchX / progressBarWidth));
        const seekTime = percentage * (duration || 0);
        onSeek?.(seekTime);
        // actualiza visualmente la barra mientras arrastras
        progressAnimation.setValue(percentage);
      },

      onPanResponderRelease: (evt) => {
        Animated.spring(thumbAnimation, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }).start();

        const touchX = evt.nativeEvent.locationX;
        const percentage = Math.max(0, Math.min(1, touchX / progressBarWidth));
        const seekTime = percentage * (duration || 0);
        onSeekEnd?.(seekTime);
      },
    })
  ).current;

  const progressWidth = progressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, progressBarWidth],
  });

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: barOpacity,
        },
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      {/* Tiempo transcurrido y duración */}
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </Text>
      </View>

      <View style={styles.progressBarContainer}>
        {/* Fondo */}
        <View style={styles.progressBarBackground} />

        {/* Progreso */}
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressWidth,
            },
          ]}
        />

        {/* Área táctil + thumb */}
        <View style={styles.touchArea} {...panResponder.panHandlers}>
          <Animated.View
            style={[
              styles.thumbContainer,
              {
                transform: [
                  {
                    translateX: progressAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, progressBarWidth],
                    }),
                  },
                  { scale: thumbAnimation },
                ],
              },
            ]}
          >
            <View style={styles.thumbOuter}>
              <View style={styles.thumb} />
            </View>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
    zIndex: 100,
  },
  timeContainer: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  timeText: {
    color: "white",
    fontSize: 12,
    fontFamily: fontNames.regular,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressBarContainer: {
    height: 40,
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
  touchArea: {
    position: "absolute",
    height: 40,
    left: 0,
    right: 0,
    justifyContent: "center",
  },
  thumbContainer: {
    position: "absolute",
    width: 20,
    height: 20,
    marginLeft: -10,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  thumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default VideoProgressBar;
