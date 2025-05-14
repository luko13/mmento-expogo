"use client"

import type React from "react"
import { useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from "react-native"
import { styled } from "nativewind"
import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons, Feather, FontAwesome } from "@expo/vector-icons"

// Habilitar LayoutAnimation en Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTouchableOpacity = styled(TouchableOpacity)

export type StageType = "effect" | "secret" | "extra"

interface StageInfoSectionProps {
  stage: StageType
  category: string
  description?: string
}

const StageInfoSection: React.FC<StageInfoSectionProps> = ({ stage, category, description }) => {
  const [expanded, setExpanded] = useState(false)

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(!expanded)
  }

  const getStageIcon = () => {
    switch (stage) {
      case "effect":
        return <Ionicons name="flash" size={24} color="white" />
      case "secret":
        return <Feather name="lock" size={24} color="white" />
      case "extra":
        return <FontAwesome name="file-text-o" size={24} color="white" />
      default:
        return <Ionicons name="flash" size={24} color="white" />
    }
  }

  const getStageName = () => {
    switch (stage) {
      case "effect":
        return "Effect"
      case "secret":
        return "Secret"
      case "extra":
        return "Extra"
      default:
        return "Effect"
    }
  }

  return (
    <StyledView style={styles.container}>
      <StyledView style={styles.borderContainer}>
        <BlurView intensity={25} tint="default" style={styles.blurContainer}>
          <LinearGradient
            colors={["#d4d4d426", "#6e6e6e14"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <StyledTouchableOpacity style={styles.button} onPress={toggleExpand} activeOpacity={0.8}>
              <StyledView style={styles.stageInfo}>
                {getStageIcon()}
                <StyledText style={styles.stageName}>{getStageName()}</StyledText>
              </StyledView>

              <StyledView style={styles.separator} />

              <StyledText style={styles.categoryName}>{category}</StyledText>
            </StyledTouchableOpacity>

            {expanded && (
              <StyledView style={styles.expandedContent}>
                <StyledText style={styles.description}>{description || "No description available."}</StyledText>
              </StyledView>
            )}
          </LinearGradient>
        </BlurView>
      </StyledView>
    </StyledView>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  borderContainer: {
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
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  stageInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  stageName: {
    color: "white",
    fontSize: 18,
    fontWeight: "500",
    marginLeft: 10,
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 16,
  },
  categoryName: {
    color: "#44C3A6", // Mint green
    fontSize: 18,
    fontWeight: "500",
  },
  expandedContent: {
    padding: 20,
    paddingTop: 0,
  },
  description: {
    color: "white",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 16,
  },
})

export default StageInfoSection
