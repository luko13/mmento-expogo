"use client"

import type React from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { styled } from "nativewind"
import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTouchableOpacity = styled(TouchableOpacity)

interface StatsPanelProps {
  visible: boolean
  onToggle: () => void
  angle?: number
  resetTime?: number
  duration?: number
  difficulty?: number
}

const StatsPanel: React.FC<StatsPanelProps> = ({ visible, onToggle, angle, resetTime, duration, difficulty }) => {
  // Función para convertir dificultad numérica a texto
  const getDifficultyText = (level = 0) => {
    if (level <= 2) return "Beginner"
    if (level <= 4) return "Easy"
    if (level <= 6) return "Intermediate"
    if (level <= 8) return "Advanced"
    return "Expert"
  }

  // Función para convertir dificultad numérica a color
  const getDifficultyColor = (level = 0) => {
    if (level <= 2) return "#4ade80" // green-400
    if (level <= 4) return "#22d3ee" // cyan-400
    if (level <= 6) return "#facc15" // yellow-400
    if (level <= 8) return "#fb923c" // orange-400
    return "#ef4444" // red-400
  }

  return (
    <StyledView style={styles.container}>
      <StyledTouchableOpacity onPress={onToggle} style={styles.toggleButton}>
        <BlurView intensity={25} tint="default" style={styles.blurToggle}>
          <LinearGradient
            colors={["#d4d4d426", "#6e6e6e14"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientToggle}
          >
            <MaterialIcons name="bar-chart" size={20} color="white" />
            <StyledText style={styles.toggleText}>Stats</StyledText>
            <Ionicons name={visible ? "chevron-down" : "chevron-up"} size={20} color="white" />
          </LinearGradient>
        </BlurView>
      </StyledTouchableOpacity>

      {visible && (
        <StyledView style={styles.statsContainer}>
          <BlurView intensity={25} tint="default" style={styles.blurContainer}>
            <LinearGradient
              colors={["#d4d4d426", "#6e6e6e14"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              <StyledView style={styles.statsGrid}>
                {/* Ángulo */}
                <StyledView style={styles.statItem}>
                  <MaterialCommunityIcons name="angle-acute" size={24} color="white" />
                  <StyledText style={styles.statValue}>{angle || 0}°</StyledText>
                  <StyledText style={styles.statLabel}>Angle</StyledText>
                </StyledView>

                {/* Tiempo de reset */}
                <StyledView style={styles.statItem}>
                  <Ionicons name="refresh" size={24} color="white" />
                  <StyledText style={styles.statValue}>{resetTime || 0}s</StyledText>
                  <StyledText style={styles.statLabel}>Reset</StyledText>
                </StyledView>

                {/* Duración */}
                <StyledView style={styles.statItem}>
                  <Ionicons name="time" size={24} color="white" />
                  <StyledText style={styles.statValue}>{duration || 0}s</StyledText>
                  <StyledText style={styles.statLabel}>Duration</StyledText>
                </StyledView>

                {/* Dificultad */}
                <StyledView style={styles.statItem}>
                  <MaterialIcons name="bar-chart" size={24} color={getDifficultyColor(difficulty)} />
                  <StyledText style={[styles.statValue, { color: getDifficultyColor(difficulty) }]}>
                    {getDifficultyText(difficulty)}
                  </StyledText>
                  <StyledText style={styles.statLabel}>Difficulty</StyledText>
                </StyledView>
              </StyledView>
            </LinearGradient>
          </BlurView>
        </StyledView>
      )}
    </StyledView>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  toggleButton: {
    alignSelf: "center",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    overflow: "hidden",
  },
  blurToggle: {
    borderRadius: 9999,
    overflow: "hidden",
  },
  gradientToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  toggleText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  statsContainer: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    overflow: "hidden",
  },
  blurContainer: {
    borderRadius: 20,
    overflow: "hidden",
  },
  gradient: {
    borderRadius: 20,
    padding: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statItem: {
    width: "48%",
    alignItems: "center",
    marginBottom: 16,
  },
  statValue: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  statLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    marginTop: 2,
  },
})

export default StatsPanel
