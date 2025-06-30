// components/add-magic/steps/EffectStep.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import {
  Feather,
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import type { MagicTrick } from "../../../types/magicTrick";
import { LinearGradient } from "expo-linear-gradient";
import CustomTooltip from "../../ui/Tooltip";
import { MediaSelector, MediaSelectorRef } from "../../ui/MediaSelector";
import { fontNames } from "../../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

interface StepProps {
  trickData: MagicTrick;
  updateTrickData: (data: Partial<MagicTrick>) => void;
  onNext?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  currentStep?: number;
  totalSteps?: number;
  isSubmitting?: boolean;
  isNextButtonDisabled?: boolean;
  isLastStep?: boolean;
}

export default function EffectStep({
  trickData,
  updateTrickData,
  onNext,
  onCancel,
  onSave,
  currentStep = 2,
  totalSteps = 3,
  isSubmitting = false,
}: StepProps) {
  const { t } = useTranslation();

  // Referencias a los selectores de media
  const effectVideoRef = useRef<MediaSelectorRef>(null);
  const secretVideoRef = useRef<MediaSelectorRef>(null);
  const photosRef = useRef<MediaSelectorRef>(null);

  // Function to dismiss keyboard
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Navigate to extras step
  const goToExtrasStep = () => {
    if (onNext) {
      onNext();
    }
  };
  // Obtener fecha actual formateada
  const getCurrentDate = () => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  };
  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <StyledView className="flex-1">
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
        <StyledView className="px-3 pt-4 pb-4">
          <StyledView className="flex-row items-center justify-between">
            <StyledTouchableOpacity onPress={onCancel} className="p-2">
              <Feather name="chevron-left" size={24} color="white" />
            </StyledTouchableOpacity>

            <StyledText
              className="text-white text-lg font-semibold"
              style={{
                fontFamily: fontNames.light,
                fontSize: 20,
                includeFontPadding: false,
              }}
            >
              {trickData.title || t("trickTitle", "[Title Magic]")}
            </StyledText>

            <StyledTouchableOpacity
              className={`p-2 ${isSubmitting ? "opacity-30" : ""}`}
              onPress={() => {
                if (onSave && !isSubmitting) {
                  onSave();
                }
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Ionicons name="refresh" size={24} color="white" />
              ) : (
                <Feather name="save" size={24} color="white" />
              )}
            </StyledTouchableOpacity>
          </StyledView>

          <StyledText
            className="text-[#FFFFFF]/50 text-sm opacity-70 text-center"
            style={{
              fontFamily: fontNames.light,
              fontSize: 16,
              includeFontPadding: false,
            }}
          >
            {getCurrentDate()}
          </StyledText>
        </StyledView>

        <StyledScrollView
          className="flex-1 px-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Effect Section */}
          <StyledView className="mt-1">
            <StyledText
              className="text-white text-lg mb-2"
              style={{
                fontFamily: fontNames.light,
                fontSize: 20,
                includeFontPadding: false,
              }}
            >
              {t("effect", "Efecto")}
            </StyledText>

            {/* Effect Video - Solo selección local, la compresión se hace al guardar */}
            <MediaSelector
              ref={effectVideoRef}
              type="video"
              multiple={false}
              maxFiles={1}
              maxFileSize={50}
              quality={0.5}
              tooltip={t("tooltips.effectVideo")}
              placeholder={t("uploadEffectVideo", "Subir video del efecto*")}
              onFilesSelected={(files) => {
                updateTrickData({
                  localFiles: {
                    effectVideo: files[0]?.uri || null,
                    secretVideo: trickData.localFiles?.secretVideo || null,
                    photos: trickData.localFiles?.photos || [],
                  },
                });
              }}
              disableEncryption={true}
            />

            {/* Effect Description */}
            <StyledView className="mb-4 mt-4">
              <StyledView className="flex-row items-center">
                <CustomTooltip
                  text={t("tooltips.effectDescription")}
                  backgroundColor="rgba(91, 185, 163, 0.95)"
                  textColor="white"
                >
                  <StyledView className="w-12 h-20 bg-[#D4D4D4]/10 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                    <MaterialCommunityIcons
                      name="creation"
                      size={24}
                      color="white"
                    />
                  </StyledView>
                </CustomTooltip>
                <StyledView className="flex-1 ">
                  <StyledTextInput
                    className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#eafffb]/40 min-h-[80px]"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 16,
                      includeFontPadding: false,
                    }}
                    placeholder={t(
                      "effectShortDescription",
                      "Descripción corta del efecto"
                    )}
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={trickData.effect}
                    onChangeText={(text) => updateTrickData({ effect: text })}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </StyledView>
              </StyledView>
            </StyledView>
          </StyledView>

          {/* Secret Section */}
          <StyledView className="mb-2">
            <StyledText
              className="text-white text-lg mb-2"
              style={{
                fontFamily: fontNames.light,
                fontSize: 20,
                includeFontPadding: false,
              }}
            >
              {t("secret", "Secreto")}
            </StyledText>

            {/* Secret Video */}
            <MediaSelector
              ref={secretVideoRef}
              type="video"
              multiple={false}
              maxFiles={1}
              maxFileSize={50}
              quality={0.5}
              tooltip={t("tooltips.secretVideo")}
              placeholder={t("secretVideoUpload", "Subir video del secreto")}
              onFilesSelected={(files) => {
                updateTrickData({
                  localFiles: {
                    effectVideo: trickData.localFiles?.effectVideo || null,
                    secretVideo: files[0]?.uri || null,
                    photos: trickData.localFiles?.photos || [],
                  },
                });
              }}
              disableEncryption={true}
            />

            {/* Secret Description */}
            <StyledView className="mb-4 mt-4">
              <StyledView className="flex-row items-center">
                <CustomTooltip
                  text={t("tooltips.secretDescription")}
                  backgroundColor="rgba(91, 185, 163, 0.95)"
                  textColor="white"
                >
                  <StyledView className="w-12 h-20 bg-[#D4D4D4]/10 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                    <Feather name="lock" size={24} color="white" />
                  </StyledView>
                </CustomTooltip>
                <StyledView className="flex-1 ">
                  <StyledTextInput
                    className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#eafffb]/40 min-h-[80px]"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 16,
                      includeFontPadding: false,
                    }}
                    placeholder={t(
                      "effectSecretDescription",
                      "Descripción del secreto del efecto"
                    )}
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={trickData.secret}
                    onChangeText={(text) => updateTrickData({ secret: text })}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </StyledView>
              </StyledView>
            </StyledView>
          </StyledView>

          {/* Photos Section */}
          <StyledView className="mb-16">
            <StyledText
              className="text-white text-lg mb-2"
              style={{
                fontFamily: fontNames.light,
                fontSize: 20,
                includeFontPadding: false,
              }}
            >
              {t("photos", "Fotos")}
            </StyledText>

            {/* Photos */}
            <MediaSelector
              ref={photosRef}
              type="photo"
              multiple={true}
              maxFiles={10}
              maxFileSize={10}
              quality={0.4}
              tooltip={t("tooltips.imageUpload")}
              placeholder={t("imagesUpload", "Subir Imágenes")}
              onFilesSelected={(files) => {
                updateTrickData({
                  localFiles: {
                    effectVideo: trickData.localFiles?.effectVideo || null,
                    secretVideo: trickData.localFiles?.secretVideo || null,
                    photos: files.map((f) => f.uri),
                  },
                });
              }}
              disableEncryption={true}
            />
          </StyledView>
        </StyledScrollView>

        <StyledView className="justify-end px-6 pb-6">
          {/* Step indicator */}
          <StyledText
            className="text-center text-white/60 mb-4"
            style={{
              fontFamily: fontNames.light,
              fontSize: 14,
              includeFontPadding: false,
            }}
          >
            {`${currentStep} de ${totalSteps}`}
          </StyledText>

          {/* Statistics Button */}
          <StyledTouchableOpacity
            className="w-full py-4 rounded-lg items-center justify-center flex-row bg-[#2C6B5C]"
            onPress={goToExtrasStep}
          >
            <StyledText
              className="text-white font-semibold text-base"
              style={{
                fontFamily: fontNames.light,
                fontSize: 18,
                includeFontPadding: false,
              }}
            >
              {t("statistics", "Estadísticas")}
            </StyledText>
            <StyledText
              className="text-white/60 text-base ml-1"
              style={{
                fontFamily: fontNames.extraLight,
                fontSize: 18,
                includeFontPadding: false,
              }}
            >
              {t("optional", "(Opcional)")}
            </StyledText>
            <Feather
              name="chevron-right"
              size={20}
              color="white"
              style={{ position: "absolute", right: 16 }}
            />
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>
    </TouchableWithoutFeedback>
  );
}
