// components/add-magic/steps/TitleCategoryStep.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { Feather, Ionicons, FontAwesome6, AntDesign } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import type { MagicTrick } from "../../../types/magicTrick";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TagSelector from "../../../components/ui/TagSelector";
import CategorySelector from "../../../components/ui/CategorySelector";
import CustomTooltip from "../../ui/Tooltip";
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
  isEditMode?: boolean;
}

const { width } = Dimensions.get("window");

export default function TitleCategoryStep({
  trickData,
  updateTrickData,
  onNext,
  onCancel,
  onSave,
  currentStep = 1,
  totalSteps = 3,
  isSubmitting = false,
  isNextButtonDisabled = false,
  isLastStep = false,
  isEditMode = false,
}: StepProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string | undefined>();

  // Validación en tiempo real del título
  const titleValidation = useMemo(() => {
    if (!trickData.title) return { isValid: false, message: "" };

    const trimmed = trickData.title.trim();
    if (trimmed.length === 0) {
      return { isValid: false, message: t("validation.titleRequired") };
    }
    if (trimmed.length < 3) {
      return { isValid: false, message: t("validation.titleTooShort") };
    }
    if (trimmed.length > 100) {
      return { isValid: false, message: t("validation.titleTooLong") };
    }
    return { isValid: true, message: "" };
  }, [trickData.title, t]);

  // Validación de categoría
  const categoryValidation = useMemo(() => {
    if (!trickData.selectedCategoryId) {
      return { isValid: false, message: t("validation.categoryRequired") };
    }
    return { isValid: true, message: "" };
  }, [trickData.selectedCategoryId, t]);

  const isFormValid = titleValidation.isValid && categoryValidation.isValid;

  // Usuario
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    })();
  }, []);

  // Handlers
  const handleTitleChange = (text: string) => updateTrickData({ title: text });
  const handleCategoriesChange = (categories: string[]) =>
    updateTrickData({
      selectedCategoryId: categories[0] || undefined,
      categories: trickData.categories,
    });
  const handleTagsChange = (tags: string[]) => updateTrickData({ tags });
  const dismissKeyboard = () => Keyboard.dismiss();

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <StyledView className="flex-1">
        <StyledView className="flex-1" style={{ paddingTop: 15 }}>
          {/* Header */}
          <StyledView className="px-3 mb-4">
            <StyledView className="flex-row items-center justify-between">
              <StyledTouchableOpacity className="p-2" onPress={onCancel}>
                <Feather name="x" size={24} color="white" />
              </StyledTouchableOpacity>

              <StyledText
                className="text-white text-lg font-semibold"
                style={{
                  fontFamily: fontNames.light,
                  fontSize: 20,
                  includeFontPadding: false,
                }}
              >
                {isEditMode
                  ? t("forms.editMagic", "Editar Magia")
                  : t("forms.registerMagic", "Registrar Item Mágico")}
              </StyledText>

              <StyledTouchableOpacity
                className={`p-2 ${
                  !isFormValid || isSubmitting ? "opacity-30" : ""
                }`}
                onPress={() => {
                  if (isFormValid && onSave) onSave();
                }}
                disabled={!isFormValid || isSubmitting}
              >
                <StyledText
                  className="text-white font-semibold"
                  style={{
                    fontFamily: fontNames.light,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                >
                  {isSubmitting ? t("saving", "Saving...") : t("save", "Save")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Form Container */}
          <StyledScrollView
            className="flex-1 px-6"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {/* Título de sección */}
            <StyledText
              className="text-white text-lg mb-2"
              style={{
                fontFamily: fontNames.light,
                fontSize: 20,
                includeFontPadding: false,
              }}
            >
              {t("clasify", "Clasificar")}
            </StyledText>

            {/* Magic Title Field */}
            <StyledView style={{ minHeight: 88 }}>
              <StyledView>
                <StyledView className="flex-row items-center">
                  <CustomTooltip
                    text={t("tooltips.magicTitle")}
                    backgroundColor="rgba(91, 185, 163, 0.95)"
                    textColor="white"
                  >
                    <StyledView className="w-12 h-12 bg-[#D4D4D4]/10 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                      <FontAwesome6
                        name="wand-magic-sparkles"
                        size={18}
                        color="white"
                      />
                    </StyledView>
                  </CustomTooltip>

                  {/* Contenedor: MISMO alto y borde que Category/Tag; sin padding izq */}
                  <StyledView className="flex-1 h-12 bg-[#D4D4D4]/10 border border-[#5bb9a3] rounded-lg flex-row items-center pr-2">
                    <StyledTextInput
                      className="flex-1 text-[#FFFFFF]/70 bg-transparent"
                      style={{
                        fontFamily: fontNames.light,
                        fontSize: 16,
                        height: 48, // altura fija
                        lineHeight: 22, // no corta descendentes
                        paddingVertical: 0, // sin padding vertical
                        paddingLeft: 14, // inset real: evita mordisco y ALINEA con Category/Tag
                        includeFontPadding: false,
                        ...(Platform.OS === "android"
                          ? { textAlignVertical: "center" as any }
                          : { paddingTop: 1 }), // iOS baseline fino
                      }}
                      placeholder={`${t("forms.magicTitlePlaceholder")}`}
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      value={trickData.title}
                      onChangeText={handleTitleChange}
                      maxLength={100}
                      autoCapitalize="sentences"
                      autoCorrect={false}
                      returnKeyType="next"
                      allowFontScaling={false}
                      multiline={false}
                    />
                  </StyledView>
                </StyledView>

                {trickData.title && !titleValidation.isValid && (
                  <StyledText
                    className="text-red-400 text-xs ml-11 mt-1"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 12,
                      includeFontPadding: false,
                    }}
                  >
                    {titleValidation.message}
                  </StyledText>
                )}
              </StyledView>
            </StyledView>

            {/* Spacer after Title */}
            <StyledView style={{ height: 6 }} />

            {/* Category Selector */}
            <StyledView style={{ minHeight: 132 }}>
              <CategorySelector
                selectedCategories={
                  trickData.selectedCategoryId
                    ? [trickData.selectedCategoryId]
                    : []
                }
                onCategoriesChange={handleCategoriesChange}
                allowCreate={true}
                allowMultiple={false}
                placeholder={t("forms.categoryPlaceholder")}
                userId={userId}
                iconComponent={
                  <CustomTooltip
                    text={t("tooltips.category")}
                    backgroundColor="rgba(91, 185, 163, 0.95)"
                    textColor="white"
                  >
                    <StyledView className="w-12 h-12 bg-[#D4D4D4]/10 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                      <Feather name="folder" size={24} color="white" />
                    </StyledView>
                  </CustomTooltip>
                }
              />
            </StyledView>

            {/* Spacer after Category */}
            <StyledView style={{ height: 16 }} />

            {/* Tag Selector */}
            <StyledView style={{ minHeight: 132 }}>
              <TagSelector
                selectedTags={trickData.tags}
                onTagsChange={handleTagsChange}
                allowCreate={true}
                placeholder={t("forms.tagPlaceholder")}
                userId={userId}
                iconComponent={
                  <CustomTooltip
                    text={t("tooltips.tags")}
                    backgroundColor="rgba(91, 185, 163, 0.95)"
                    textColor="white"
                  >
                    <StyledView className="w-12 h-12 bg-[#D4D4D4]/10 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                      <Feather name="tag" size={24} color="white" />
                    </StyledView>
                  </CustomTooltip>
                }
              />
            </StyledView>

            {/* Spacer - Takes up remaining space and centers the message */}
            <StyledView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 100 }}>
              {/* Info Message - Centered vertically in remaining space */}
              <StyledView className="items-center justify-center">
                <StyledView className="mb-2">
                  <AntDesign name="Safety" size={32} color="#5BB9A3" />
                </StyledView>

                <StyledText
                  className="text-[#5BB9A3] text-xs text-center"
                  style={{
                    fontFamily: fontNames.light,
                    fontSize: 12,
                    includeFontPadding: false,
                  }}
                >
                  {t("info.secureMagic", "Seguro & Encriptado")}
                </StyledText>
              </StyledView>
            </StyledView>
          </StyledScrollView>

          {/* Bottom Section */}
          <StyledView className="justify-end pt-6 px-6 pb-6">
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

            <StyledTouchableOpacity
              className={`w-full py-4 rounded-lg items-center justify-center flex-row ${
                isFormValid && !isSubmitting && !isLastStep
                  ? "bg-[#2C6B5C]"
                  : "bg-transparent border border-[#2C6B5C]"
              }`}
              disabled={!isFormValid || isSubmitting || isLastStep}
              onPress={() => {
                if (isFormValid && onNext) onNext();
              }}
            >
              <StyledText
                className="text-white text-base mr-2"
                style={{
                  fontFamily: fontNames.light,
                  fontSize: 18,
                  includeFontPadding: false,
                }}
              >
                {t("actions.content", "Content")}
              </StyledText>
              <Feather name="chevron-right" size={20} color="white" />
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      </StyledView>
    </TouchableWithoutFeedback>
  );
}
