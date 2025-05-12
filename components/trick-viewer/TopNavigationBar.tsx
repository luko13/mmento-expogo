import React from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { styled } from "nativewind"
import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import { ChevronLeft, Heart, Edit } from "lucide-react-native"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTouchableOpacity = styled(TouchableOpacity)

interface TopNavigationBarProps {
  title: string
  onBackPress: () => void
  onLikePress?: () => void
  onEditPress?: () => void
  isLiked?: boolean
}

const TopNavigationBar: React.FC<TopNavigationBarProps> = ({
  title,
  onBackPress,
  onLikePress,
  onEditPress,
  isLiked = false,
}) => {
  return (
    <StyledView style={styles.container}>
      <BlurView intensity={25} tint="default" style={styles.blurContainer}>
          <LinearGradient
            colors={["#d4d4d426", "#6e6e6e14"]} // Negro a beige
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {/* Icono de flecha hacia atrás */}
          <StyledTouchableOpacity onPress={onBackPress} style={styles.iconButton}>
            <ChevronLeft color="white" size={20} />
          </StyledTouchableOpacity>

          {/* Título centrado */}
          <StyledText style={styles.title}>{title}</StyledText>

          {/* Contenedor de iconos derechos */}
          <StyledView style={styles.rightIconsContainer}>
            {/* Icono de corazón */}
            <StyledTouchableOpacity onPress={onLikePress} style={styles.iconButton}>
              <Heart color={isLiked ? "#ff4d6d" : "white"} fill={isLiked ? "#ff4d6d" : "transparent"} size={20} />
            </StyledTouchableOpacity>

            {/* Icono de editar */}
            <StyledTouchableOpacity onPress={onEditPress} style={styles.iconButton}>
              <Edit color="white" size={20} />
            </StyledTouchableOpacity>
          </StyledView>
        </LinearGradient>
      </BlurView>
    </StyledView>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginHorizontal: 12,
  },
  blurContainer: {
    borderRadius: 9999, // Bordes completamente redondeados
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 8,
    opacity: 0.85,
  },
  iconButton: {
    padding: 4, // Padding adicional para área de toque
  },
  title: {
    color: "white",
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    fontWeight: "600", // Medium
    textAlign: "center",
    textShadowColor: "#00000026",
    textShadowOffset: {width: 0.5, height: 0.5}, 
    textShadowRadius: 1,
    flex: 1,
  },
  rightIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12, // Espacio entre iconos
  },
})

export default TopNavigationBar
