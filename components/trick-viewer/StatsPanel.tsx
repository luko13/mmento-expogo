import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { styled } from "nativewind"
import { BlurView } from "expo-blur"
import { RotateCcw, Timer, Clock } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"

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

const StatsPanel: React.FC<StatsPanelProps> = ({
  visible,
  onToggle,
  angle = 180,
  resetTime = 10,
  duration = 110,
  difficulty = 7,
}) => {
  // Formatear tiempo en segundos o minutos
  const formatTime = (seconds: number, unit: "Sec" | "Min") => {
    if (unit === "Min") {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")} ${unit}`
    }
    return `00:${seconds.toString().padStart(2, "0")} ${unit}`
  }

  return (
    <StyledView style={styles.container}>
      {visible && (
        <StyledView style={styles.statsPanel}>
          <BlurView intensity={25} tint="default" style={styles.blurPanel}>
            <LinearGradient
              colors={["#d4d4d426", "#6e6e6e14"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientPanel}
            >
              {/* Ángulo */}
              <StyledView style={styles.statBlock}>
                <StyledText style={styles.statLabel}>Angle</StyledText>
                <StyledView style={styles.statIconContainer}>
                  <RotateCcw size={20} color="white" />
                </StyledView>
                <StyledText style={styles.statValue}>{angle}°</StyledText>
              </StyledView>

              {/* Tiempo de Reset */}
              <StyledView style={styles.statBlock}>
                <StyledText style={styles.statLabel}>Reset Time</StyledText>
                <StyledView style={styles.statIconContainer}>
                  <Clock size={20} color="white" />
                </StyledView>
                <StyledText style={styles.statValue}>{formatTime(resetTime, "Sec")}</StyledText>
              </StyledView>

              {/* Duración */}
              <StyledView style={styles.statBlock}>
                <StyledText style={styles.statLabel}>Duration</StyledText>
                <StyledView style={styles.statIconContainer}>
                  <Timer size={20} color="white" />
                </StyledView>
                <StyledText style={styles.statValue}>{formatTime(duration, "Min")}</StyledText>
              </StyledView>

              {/* Dificultad */}
              <StyledView style={styles.statBlock}>
                <StyledText style={styles.statLabel}>Difficulty</StyledText>
                <StyledView style={styles.difficultyContainer}>
                  <StyledText style={styles.difficultyValue}>{difficulty}</StyledText>
                </StyledView>
              </StyledView>
            </LinearGradient>
          </BlurView>
        </StyledView>
      )}

      {/* Botón de toggle - ahora cuadrado con borde */}
      <StyledTouchableOpacity style={styles.toggleButton} onPress={onToggle}>
        <StyledView style={styles.toggleBorder}>
          <BlurView intensity={25} tint="default" style={styles.blurToggle}>
            <LinearGradient
              colors={["#d4d4d426", "#6e6e6e14"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientPanel}
            >
            <StyledView style={styles.customStatsIcon}>
              <StyledView style={[styles.statBar, { height: 16 }]} />
              <StyledView style={[styles.statBar, { height: 24 }]} />
              <StyledView style={[styles.statBar, { height: 20 }]} />
            </StyledView>
            </LinearGradient>
          </BlurView>
        </StyledView>
      </StyledTouchableOpacity>
    </StyledView>
  )
}

// Modificar los estilos para que el botón permanezca fijo y el panel aparezca encima
// sin desplazar el botón

// Cambiar el estilo del container para posicionar correctamente
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: -15,
    right: 16,
    zIndex: 20,
  },
  toggleButton: {
    width: 56,
    height: 56,
    position: "absolute", // Posición absoluta para el botón
    right: 0, // Alineado a la derecha
    bottom: 0, // Alineado abajo
  },
  toggleBorder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    overflow: "hidden",
  },
  blurToggle: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  customStatsIcon: {
    width: 24,
    height: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  statBar: {
    width: 4,
    backgroundColor: "white",
    borderRadius: 2,
    marginHorizontal: 2,
  },
  statsPanel: {
    position: "absolute", // Posición absoluta para el panel
    bottom: 56, // Posicionado justo encima del botón (48px altura + 8px espacio)
    right: 0, // Alineado a la derecha
    borderRadius: 12,
    overflow: "hidden",
  },
  blurPanel: {
    borderRadius: 12,
  },
  gradientPanel: {
    borderRadius: 12,
    padding: 12,
  },
  statBlock: {
    alignItems: "center",
    marginBottom: 12,
    width: 64,
  },
  statLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    marginBottom: 4,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  statValue: {
    color: "white",
    fontSize: 12,
  },
  difficultyContainer: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  difficultyValue: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
})

export default StatsPanel
