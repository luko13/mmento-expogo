//components/trick-viewer/StatsPanel.tsx
"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { fontNames } from "../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

/* -------------------- DEBUG FLAGS -------------------- */
const DEBUG_GUARD = false;
const DEBUG_WDYR = false;
/* ----------------------------------------------------- */

/* -------------------- DEBUG HOOKS -------------------- */
function useInfiniteLoopGuard(name: string, limit = 60) {
  const countRef = useRef(0);
  useEffect(() => {
    countRef.current++;
    if (countRef.current > limit) {
      throw new Error(`Render loop detected in <${name}>`);
    }
    const id = setTimeout(() => {
      countRef.current = 0;
    }, 0);
    return () => clearTimeout(id);
  });
}

function useWhyDidYouUpdate<T extends Record<string, any>>(
  name: string,
  props: T
) {
  const prev = useRef<T | null>(null);
  useEffect(() => {
    if (prev.current) {
      const keys = Object.keys({ ...prev.current, ...props });
      const changes: Record<string, { from: any; to: any }> = {};
      keys.forEach((k) => {
        if (prev.current![k] !== props[k]) {
          changes[k] = { from: prev.current![k], to: props[k] };
        }
      });
      if (Object.keys(changes).length > 0) {
        console.log(`[WDYR] StatsPanel`, changes);
      }
    }
    prev.current = props;
  });
}
/* ----------------------------------------------------- */

interface StatsPanelProps {
  visible: boolean;
  onToggle: () => void;
  angle?: number;
  resetTime?: number;
  duration?: number;
  difficulty?: number | null;
}

const StatsPanel: React.FC<StatsPanelProps> = ({
  visible,
  onToggle,
  angle,
  resetTime,
  duration,
  difficulty,
}) => {
  if (DEBUG_GUARD) useInfiniteLoopGuard("StatsPanel");
  if (DEBUG_WDYR)
    useWhyDidYouUpdate("StatsPanel", {
      visible,
      angle,
      resetTime,
      duration,
      difficulty,
    });

  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isPressed, setIsPressed] = useState(false);

  // ⚠️ Importante: depender solo de `visible`
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [visible]); // <- NO incluir slideAnim

  const getDifficultyColor = (level = 0) => {
    return "#ffffff78";
  };

  return (
    <StyledView style={styles.container}>
      <StyledTouchableOpacity
        onPress={onToggle}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        style={styles.toggleButton}
      >
        <BlurView
          intensity={visible ? 80 : isPressed ? 40 : 25}
          tint="dark"
          style={styles.blurToggle}
        >
          <LinearGradient
            colors={
              visible
                ? ["#ffffff40", "#ffffff30"]
                : isPressed
                ? ["#ffffff30", "#ffffff20"]
                : ["#d4d4d426", "#6e6e6e14"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientToggle}
          >
            <MaterialIcons
              name="signal-cellular-alt"
              size={32}
              color={visible ? "#ffffff" : "rgba(255, 255, 255, 0.8)"}
            />
          </LinearGradient>
        </BlurView>
      </StyledTouchableOpacity>

      <Animated.View
        style={[
          styles.statsContainer,
          {
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
              {
                scale: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
            opacity: slideAnim,
          },
        ]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <StyledView style={styles.statsColumn}>
          {/* Ángulo */}
          <Animated.View
            style={[
              styles.statItemContainer,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <BlurView
              intensity={50}
              tint="dark"
              experimentalBlurMethod="dimezisBlurView"
              style={styles.statItemBlur}
            >
              <LinearGradient
                colors={["#ffffff15", "#ffffff08"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statItemGradient}
              >
                <StyledText style={styles.statLabel}>Angle</StyledText>
                <StyledView style={[styles.innerStatContainer, { width: 50 }]}>
                  <StyledView style={styles.innerStatGradient}>
                    <MaterialCommunityIcons
                      name="angle-acute"
                      size={18}
                      color="rgba(255,255,255,0.9)"
                      style={{ position: "absolute", bottom: 8 }}
                    />
                    <StyledText
                      style={[
                        styles.statValue,
                        { position: "absolute", fontSize: 14 },
                      ]}
                    >
                      {angle ? `${angle}°` : "-"}
                    </StyledText>
                  </StyledView>
                </StyledView>
              </LinearGradient>
            </BlurView>
          </Animated.View>

          {/* Reset */}
          <Animated.View
            style={[
              styles.statItemContainer,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <BlurView
              intensity={50}
              tint="dark"
              experimentalBlurMethod="dimezisBlurView"
              style={styles.statItemBlur}
            >
              <LinearGradient
                colors={["#ffffff15", "#ffffff08"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statItemGradient}
              >
                <StyledText style={styles.statLabel}>Reset</StyledText>
                <StyledView style={[styles.innerStatContainer, { width: 50 }]}>
                  <StyledView style={styles.innerStatGradient}>
                    <StyledText style={[styles.statValue, { fontSize: 14 }]}>
                      {(resetTime || 0) < 60
                        ? `00:${String(resetTime || 0).padStart(2, "0")}`
                        : `${Math.floor((resetTime || 0) / 60)
                            .toString()
                            .padStart(2, "0")}:${String(
                            (resetTime || 0) % 60
                          ).padStart(2, "0")}`}
                    </StyledText>
                    <StyledText style={[styles.statUnit, { fontSize: 14 }]}>
                      Min
                    </StyledText>
                  </StyledView>
                </StyledView>
              </LinearGradient>
            </BlurView>
          </Animated.View>

          {/* Duración */}
          <Animated.View
            style={[
              styles.statItemContainer,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <BlurView
              intensity={50}
              tint="dark"
              experimentalBlurMethod="dimezisBlurView"
              style={styles.statItemBlur}
            >
              <LinearGradient
                colors={["#ffffff15", "#ffffff08"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statItemGradient}
              >
                <StyledText style={styles.statLabel}>Duration</StyledText>
                <StyledView style={[styles.innerStatContainer, { width: 50 }]}>
                  <StyledView style={styles.innerStatGradient}>
                    <StyledText style={[styles.statValue, { fontSize: 14 }]}>
                      {(duration || 0) < 60
                        ? `00:${String(duration || 0).padStart(2, "0")}`
                        : `${Math.floor((duration || 0) / 60)
                            .toString()
                            .padStart(2, "0")}:${String(
                            (duration || 0) % 60
                          ).padStart(2, "0")}`}
                    </StyledText>
                    <StyledText style={[styles.statUnit, { fontSize: 14 }]}>
                      Min
                    </StyledText>
                  </StyledView>
                </StyledView>
              </LinearGradient>
            </BlurView>
          </Animated.View>

          {/* Dificultad */}
          <Animated.View
            style={[
              styles.statItemContainer,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <BlurView
              intensity={50}
              tint="dark"
              experimentalBlurMethod="dimezisBlurView"
              style={styles.statItemBlur}
            >
              <LinearGradient
                colors={["#ffffff15", "#ffffff08"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statItemGradient}
              >
                <StyledText style={styles.statLabel}>Difficulty</StyledText>
                <StyledView style={[styles.innerStatContainer, { width: 50 }]}>
                  <StyledView style={styles.innerStatGradient}>
                    {difficulty !== null && difficulty !== undefined ? (
                      <>
                        <StyledView style={styles.progressBarContainer}>
                          <StyledView
                            style={[
                              styles.progressBarFill,
                              {
                                height: `${(difficulty / 10) * 100}%`,
                                backgroundColor: getDifficultyColor(difficulty),
                              },
                            ]}
                          />
                        </StyledView>
                        <StyledText
                          style={[styles.difficultyValue, { fontSize: 18 }]}
                        >
                          {difficulty}
                        </StyledText>
                      </>
                    ) : (
                      <StyledText
                        style={[styles.difficultyValue, { fontSize: 24 }]}
                      >
                        –
                      </StyledText>
                    )}
                  </StyledView>
                </StyledView>
              </LinearGradient>
            </BlurView>
          </Animated.View>
        </StyledView>
      </Animated.View>
    </StyledView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 12,
    top: -56,
    alignItems: "flex-end",
  },
  toggleButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    overflow: "hidden",
    width: 60,
    height: 60,
    zIndex: 2,
  },
  blurToggle: {
    borderRadius: 14,
    overflow: "hidden",
    flex: 1,
  },
  gradientToggle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statsContainer: {
    position: "absolute",
    bottom: 70,
    right: 0,
  },
  statsColumn: {
    flexDirection: "column",
    gap: 15,
  },
  statItemContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    overflow: "hidden",
    width: 60,
    height: 120,
  },
  statItemBlur: {
    borderRadius: 16,
    overflow: "hidden",
    flex: 1,
  },
  statItemGradient: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(80, 80, 80, 0.3)",
    flex: 1,
  },
  innerStatContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
    width: 64,
    height: 80,
  },
  innerStatGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(161, 161, 161, 0.596)",
  },
  statValue: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: fontNames.medium,
    includeFontPadding: false,
    textAlign: "center",
  },
  difficultyValue: {
    color: "#ffffff",
    fontSize: 26,
    fontFamily: fontNames.semiBold,
    includeFontPadding: false,
    position: "absolute",
    zIndex: 2,
  },
  progressBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    overflow: "hidden",
  },
  progressBarFill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 12,
  },
  statLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 8,
    fontFamily: fontNames.regular,
    includeFontPadding: false,
  },
  statUnit: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 11,
    fontFamily: fontNames.light,
    includeFontPadding: false,
    textAlign: "center",
  },
});

export default StatsPanel;
