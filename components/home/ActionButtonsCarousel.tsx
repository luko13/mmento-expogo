"use client"

import type React from "react"
import { useRef, useEffect } from "react"
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Plus, Star, FileText, Wrench, Zap } from "lucide-react-native"
import { BlurView } from "expo-blur"
import { useRouter } from "expo-router"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledScrollView = styled(ScrollView)

const { width } = Dimensions.get("window")
const BUTTON_SIZE = width * 0.28 // Square buttons, approximately 28% of screen width
const BUTTON_MARGIN = 10
const VISIBLE_BUTTONS = 3 // Number of buttons visible at once

interface ActionButtonProps {
  icon: React.ElementType
  title: string
  onPress?: () => void
}

const ActionButton = ({ icon: Icon, title, onPress }: ActionButtonProps) => (
  <StyledTouchableOpacity
    onPress={onPress}
    style={{
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      marginHorizontal: BUTTON_MARGIN,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.5)",
      overflow: "hidden",
    }}
  >
    <BlurView intensity={10} tint="light" style={{ flex: 1 }}>
      <StyledView className="flex-1 justify-center items-center p-2">
        <Icon size={36} color="white" strokeWidth={1.5} />
        <StyledText className="text-white text-center mt-2 text-sm">{title}</StyledText>
      </StyledView>
    </BlurView>
  </StyledTouchableOpacity>
)

export default function ActionButtonsCarousel() {
  const { t } = useTranslation()
  const router = useRouter()
  const scrollViewRef = useRef<ScrollView>(null)

  const buttons = [
    { icon: Plus, title: t("addMagic"), onPress: () => router.push("/(app)/add-magic") },
    { icon: Star, title: t("quickMagic"), onPress: () => console.log("Quick Magic pressed") },
    { icon: Zap, title: t("addTechnique"), onPress: () => console.log("Add Technique pressed") },
    { icon: Wrench, title: t("addGimmick"), onPress: () => console.log("Add Gimmick pressed") },
    { icon: FileText, title: t("addScript"), onPress: () => console.log("Add Script pressed") },
  ]

  // Clone the first few buttons to the end for infinite scrolling effect
  const extendedButtons = [...buttons, ...buttons.slice(0, VISIBLE_BUTTONS)]

  // Auto scroll for infinite effect
  useEffect(() => {
    let scrollInterval: NodeJS.Timeout

    const startAutoScroll = () => {
      let position = 0

      scrollInterval = setInterval(() => {
        position += BUTTON_SIZE + BUTTON_MARGIN * 2

        // Reset position when we reach the end of original buttons
        if (position >= (BUTTON_SIZE + BUTTON_MARGIN * 2) * buttons.length) {
          position = 0
          // Scroll to start without animation
          scrollViewRef.current?.scrollTo({ x: 0, animated: false })
        } else {
          // Smooth scroll to next position
          scrollViewRef.current?.scrollTo({ x: position, animated: true })
        }
      }, 5000) // Scroll every 5 seconds
    }

    // Start auto-scrolling after a delay
    const timer = setTimeout(startAutoScroll, 2000)

    return () => {
      clearTimeout(timer)
      clearInterval(scrollInterval)
    }
  }, [buttons.length])

  // Handle scroll end to create infinite loop effect
  const handleScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x
    const contentWidth = (BUTTON_SIZE + BUTTON_MARGIN * 2) * buttons.length

    // If we've scrolled past the original buttons, jump back to the beginning
    if (offsetX >= contentWidth) {
      scrollViewRef.current?.scrollTo({ x: offsetX % contentWidth, animated: false })
    }
    // If we've scrolled to the beginning, jump to the end
    else if (offsetX <= 0) {
      scrollViewRef.current?.scrollTo({ x: contentWidth, animated: false })
    }
  }

  return (
    <StyledView className="mb-6">
      <StyledScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={BUTTON_SIZE + BUTTON_MARGIN * 2}
        snapToAlignment="center"
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ paddingHorizontal: BUTTON_MARGIN }}
      >
        {extendedButtons.map((button, index) => (
          <ActionButton
            key={`${button.title}-${index}`}
            icon={button.icon}
            title={button.title}
            onPress={button.onPress}
          />
        ))}
      </StyledScrollView>
    </StyledView>
  )
}

