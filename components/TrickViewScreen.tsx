"use client"

import type React from "react"
import { useState, useRef } from "react"
import { View, Text, Image, TouchableOpacity, ScrollView, Dimensions, Platform } from "react-native"
import { Video, ResizeMode } from "expo-av"
import { BlurView } from "expo-blur"
import { ChevronLeft, Settings, Heart } from "lucide-react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { SafeAreaView } from "react-native-safe-area-context"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledScrollView = styled(ScrollView)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledSafeAreaView = styled(SafeAreaView)

const { width, height } = Dimensions.get("window")

interface TrickViewScreenProps {
  trick: {
    id: string
    title: string
    category: string
    effect: string
    secret: string
    effect_video_url: string | null
    secret_video_url: string | null
    photo_url: string | null
    script: string
    angles: string[]
    duration: number
    reset: number
    difficulty: number
  }
  onClose: () => void
}

const TrickViewScreen: React.FC<TrickViewScreenProps> = ({ trick, onClose }) => {
  const { t } = useTranslation()
  const [currentSection, setCurrentSection] = useState<"effect" | "secret" | "photos">("effect")
  const scrollViewRef = useRef<ScrollView>(null)

  const renderVideo = (url: string | null) => {
    if (!url) {
      return (
        <StyledView className="w-full h-full items-center justify-center bg-gray-900">
          <StyledText className="text-white text-xl">{t("noVideoAvailable", "No video available")}</StyledText>
        </StyledView>
      )
    }
    return (
      <Video
        source={{ uri: url }}
        rate={1.0}
        volume={1.0}
        isMuted={false}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        style={{ width: "100%", height: "100%" }}
      />
    )
  }

  const renderInfoOverlay = () => (
    <BlurView intensity={20} tint="dark" style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 16 }}>
      <StyledText className="text-white text-lg font-bold mb-2">{trick.title}</StyledText>
      <StyledText className="text-white mb-2">{trick.category}</StyledText>
      <StyledView className="flex-row justify-between">
        <StyledView>
          <StyledText className="text-white">
            {t("angles")}: {trick.angles && trick.angles.length > 0 ? trick.angles[0] : "N/A"}
          </StyledText>
          <StyledText className="text-white">
            {t("resetTime")}: {trick.reset || 0} sec
          </StyledText>
        </StyledView>
        <StyledView>
          <StyledText className="text-white">
            {t("duration")}: {trick.duration || 0} min
          </StyledText>
          <StyledText className="text-white">
            {t("difficulty")}: {trick.difficulty || 0}/10
          </StyledText>
        </StyledView>
      </StyledView>
    </BlurView>
  )

  const renderDescription = () => (
    <StyledView className="p-4 pb-16">
      <StyledText className="text-white text-lg font-bold mb-2">{t("effect")}</StyledText>
      <StyledText className="text-white mb-4">{trick.effect}</StyledText>
      <StyledText className="text-white text-lg font-bold mb-2">{t("secret")}</StyledText>
      <StyledText className="text-white mb-4">{trick.secret}</StyledText>
      <StyledText className="text-white text-lg font-bold mb-2">{t("script")}</StyledText>
      <StyledText className="text-white mb-4">{trick.script}</StyledText>
    </StyledView>
  )

  return (
    <StyledSafeAreaView className="flex-1 bg-black" edges={["top", "bottom"]}>
      <StyledScrollView
        ref={scrollViewRef}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const slideIndex = Math.floor(event.nativeEvent.contentOffset.y / height)
          setCurrentSection(slideIndex === 0 ? "effect" : slideIndex === 1 ? "secret" : "photos")
        }}
      >
        <StyledView style={{ width, height: height - (Platform.OS === "ios" ? 80 : 40) }}>
          {renderVideo(trick.effect_video_url)}
          {renderInfoOverlay()}
        </StyledView>
        <StyledView style={{ width, height: height - (Platform.OS === "ios" ? 80 : 40) }}>
          {renderVideo(trick.secret_video_url)}
          {renderInfoOverlay()}
        </StyledView>
        <StyledView style={{ width, height: height - (Platform.OS === "ios" ? 80 : 40) }}>
          {trick.photo_url ? (
            <Image source={{ uri: trick.photo_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <StyledView className="w-full h-full items-center justify-center bg-gray-900">
              <StyledText className="text-white text-xl">{t("noPhotosAvailable", "No photos available")}</StyledText>
            </StyledView>
          )}
        </StyledView>
      </StyledScrollView>
      {renderDescription()}
      <StyledView className="absolute top-0 left-0 right-0 flex-row justify-between items-center p-4">
        <StyledTouchableOpacity onPress={onClose} className="p-2">
          <ChevronLeft color="white" size={24} />
        </StyledTouchableOpacity>
        <StyledView className="flex-row">
          <StyledTouchableOpacity className="mr-4 p-2">
            <Heart color="white" size={24} />
          </StyledTouchableOpacity>
          <StyledTouchableOpacity className="p-2">
            <Settings color="white" size={24} />
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>
    </StyledSafeAreaView>
  )
}

export default TrickViewScreen

