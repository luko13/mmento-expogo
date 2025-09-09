//components/trick-viewer/TopNavigationBar.tsx
import type React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome, Entypo } from "@expo/vector-icons";
import { fontNames } from "../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface TopNavigationBarProps {
  title: string;
  onBackPress: () => void;
  onLikePress?: () => void;
  onMorePress?: () => void;
  isLiked?: boolean;
}

const TopNavigationBar: React.FC<TopNavigationBarProps> = ({
  title,
  onBackPress,
  onLikePress,
  onMorePress,
  isLiked = false,
}) => {
  return (
    <StyledView style={styles.container}>
      <BlurView intensity={50} tint="dark" experimentalBlurMethod="dimezisBlurView" style={styles.blurContainer}>
        <LinearGradient
          colors={["#d4d4d426", "#6e6e6e14"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {/* Icono de flecha hacia atrás */}
          <StyledTouchableOpacity
            onPress={onBackPress}
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" color="white" size={20} />
          </StyledTouchableOpacity>

          {/* Título centrado */}
          <StyledText style={styles.title}>{title}</StyledText>

          {/* Contenedor de iconos derechos */}
          <StyledView style={styles.rightIconsContainer}>
            {/* Icono de favorito */}
            <StyledTouchableOpacity
              onPress={onLikePress}
              style={styles.iconButton}
            >
              <FontAwesome
                name={isLiked ? "star" : "star-o"}
                size={20}
                color={isLiked ? "#fadc91" : "#fadc91"}
              />
            </StyledTouchableOpacity>

            {/* Icono de tres puntos */}
            <StyledTouchableOpacity
              onPress={onMorePress}
              style={styles.iconButton}
            >
              <Entypo name="dots-three-horizontal" size={16} color="white" />
            </StyledTouchableOpacity>
          </StyledView>
        </LinearGradient>
      </BlurView>
    </StyledView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginHorizontal: 12,
  },
  blurContainer: {
    borderRadius: 9999,
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
    padding: 4,
  },
  title: {
    color: "white",
    fontFamily: fontNames.semiBold,
    fontSize: 16,
    textAlign: "center",
    textShadowColor: "#00000026",
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
    flex: 1,
    includeFontPadding: false,
  },
  rightIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});

export default TopNavigationBar;
