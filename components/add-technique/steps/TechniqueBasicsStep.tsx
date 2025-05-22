"use client"

import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons"
import type { Technique } from "../AddTechniqueWizard"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import DifficultySlider from "../../add-magic/ui/DifficultySlider"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledScrollView = styled(ScrollView)

interface StepProps {
  techniqueData: Technique
  updateTechniqueData: (data: Partial<Technique>) => void
  onNext?: () => void
  onCancel?: () => void
  currentStep?: number
  totalSteps?: number
  isSubmitting?: boolean
  isNextButtonDisabled?: boolean
  isLastStep?: boolean
}

export default function TechniqueBasicsStep({
  techniqueData,
  updateTechniqueData,
  onNext,
  onCancel,
  currentStep = 1,
  totalSteps = 2,
  isSubmitting = false,
  isNextButtonDisabled = false,
  isLastStep = false,
}: StepProps) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  // Obtener fecha actual formateada
  const getCurrentDate = () => {
    const now = new Date()
    const day = now.getDate().toString().padStart(2, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const year = now.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Manejar cambio de dificultad
  const handleDifficultyChange = (value: number) => {
    updateTechniqueData({ difficulty: value })
  }

  return (
    <StyledView className="flex-1">
      {/* Background gradient */}
      <LinearGradient
        colors={["#15322C", "#15322C"]}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />

      {/* Header */}
      <StyledView className="flex-row items-center justify-between px-6 pt-4">
        <StyledTouchableOpacity className="p-2" onPress={onCancel}>
          <Feather name="x" size={24} color="white" />
        </StyledTouchableOpacity>
        
        <StyledView className="flex-1 items-center">
          <StyledText className="text-white text-lg font-semibold">
            {t("addTechnique", "Add Technique")}
          </StyledText>
          <StyledText className="text-emerald-200 text-sm opacity-70">
            {getCurrentDate()}
          </StyledText>
        </StyledView>
        
        <StyledTouchableOpacity className="p-2">
          <Feather name="help-circle" size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1 px-6 mt-6">
        <StyledText className="text-white/60 text-lg font-semibold mb-6">
          {t("basicInformation", "Basic Information")}
        </StyledText>

        {/* Technique Name Field */}
        <StyledView className="mb-6">
          <StyledView className="flex-row items-center mb-3">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <MaterialCommunityIcons name="flash" size={24} color="white" />
            </StyledView>
            <StyledTextInput
              className="flex-1 text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3]"
              placeholder={t("techniqueName", "Technique name")}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={techniqueData.name}
              onChangeText={(text) => updateTechniqueData({ name: text })}
              maxLength={100}
              autoCapitalize="sentences"
              autoCorrect={false}
              returnKeyType="next"
            />
          </StyledView>
        </StyledView>

        {/* Description Field */}
        <StyledView className="mb-6">
          <StyledView className="flex-row mb-3">
            <StyledView className="w-12 h-19 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
              <Feather name="file-text" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTextInput
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] min-h-[120px]"
                placeholder={t("techniqueDescription", "Describe the technique in detail")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={techniqueData.description}
                onChangeText={(text) => updateTechniqueData({ description: text })}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Difficulty Slider */}
        <StyledView className="mb-6">
          <StyledView className="flex-row mb-3">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <MaterialCommunityIcons name="signal-cellular-3" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledText className="text-white mb-2 ml-1">
                {t("difficulty", "Difficulty")}
              </StyledText>
              <StyledView className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg pb-3 border border-[#5bb9a3]">
                <DifficultySlider
                  value={techniqueData.difficulty || 5}
                  onChange={handleDifficultyChange}
                  min={1}
                  max={10}
                  step={1}
                />
              </StyledView>
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Shield Icon */}
        <StyledView className="items-center mb-8">
          <StyledView className="w-16 h-16 bg-[#5BB9A3]/40 rounded-full items-center justify-center">
            <Feather name="shield" size={32} color="rgba(255, 255, 255, 0.3)" />
          </StyledView>
          <StyledText className="text-[#5BB9A3]/40 text-xs mt-2 text-center">
            {t("security.identitySafe", "Identity Safe")}
          </StyledText>
          <StyledText className="text-[#5BB9A3]/40 text-xs text-center">
            {t("security.endToEndEncrypted", "End-to-end encrypted")}
          </StyledText>
        </StyledView>
      </StyledScrollView>

      {/* Bottom Section */}
      <StyledView className="px-6" style={{ paddingBottom: insets.bottom + 20 }}>
        {/* Step indicator */}
        <StyledText className="text-white/60 text-center text-sm mb-6">
          {`${currentStep} of ${totalSteps}`}
        </StyledText>

        {/* Next Button */}
        <StyledTouchableOpacity
          className={`w-full h-12 rounded-xl items-center justify-center flex-row ${
            !isNextButtonDisabled && !isSubmitting
              ? 'bg-emerald-700'
              : 'bg-white/10'
          }`}
          disabled={isNextButtonDisabled || isSubmitting}
          onPress={onNext}
        >
          <StyledText className="text-white font-semibold text-base mr-2">
            {isLastStep ? t("createTechnique", "Create Technique") : t("next", "Next")}
          </StyledText>
          <Feather 
            name={isLastStep ? "check" : "chevron-right"} 
            size={20} 
            color="white" 
          />
        </StyledTouchableOpacity>
      </StyledView>
    </StyledView>
  )
}