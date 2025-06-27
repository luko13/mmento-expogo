// components/add-magic/steps/TitleCategoryStep.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import {
  Feather,
  Ionicons,
  FontAwesome6,
  MaterialIcons,
  AntDesign,
  FontAwesome5,
} from "@expo/vector-icons";
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
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();

  // Obtener fecha actual formateada
  const getCurrentDate = () => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Validación en tiempo real del título
  const titleValidation = useMemo(() => {
    if (!trickData.title) {
      return { isValid: false, message: "" };
    }

    const trimmedTitle = trickData.title.trim();

    if (trimmedTitle.length === 0) {
      return {
        isValid: false,
        message: t("validation.titleRequired"),
      };
    }

    if (trimmedTitle.length < 3) {
      return {
        isValid: false,
        message: t("validation.titleTooShort"),
      };
    }

    if (trimmedTitle.length > 100) {
      return {
        isValid: false,
        message: t("validation.titleTooLong"),
      };
    }

    return { isValid: true, message: "" };
  }, [trickData.title, t]);

  // Validación de categoría
  const categoryValidation = useMemo(() => {
    if (!trickData.selectedCategoryId) {
      return {
        isValid: false,
        message: t("validation.categoryRequired"),
      };
    }
    return { isValid: true, message: "" };
  }, [trickData.selectedCategoryId, t]);

  // Validación general para el botón Next
  const isFormValid = titleValidation.isValid && categoryValidation.isValid;

  // Obtener el usuario actual
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  // Handlers
  const handleTitleChange = (text: string) => {
    updateTrickData({ title: text });
  };

  const handleCategoriesChange = (categories: string[]) => {
    // Como solo permitimos una categoría, tomamos la primera
    updateTrickData({
      selectedCategoryId: categories[0] || undefined,
      categories: trickData.categories,
    });
  };

  const handleTagsChange = (tags: string[]) => {
    updateTrickData({ tags });
  };

  // Function to dismiss keyboard
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

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
                  : t("forms.registerMagic")}
              </StyledText>

              <StyledTouchableOpacity
                className={`p-2 ${
                  !isFormValid || isSubmitting ? "opacity-30" : ""
                }`}
                onPress={() => {
                  if (isFormValid && onSave) {
                    onSave();
                  }
                }}
                disabled={!isFormValid || isSubmitting}
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

          {/* Form Container */}
          <StyledScrollView
            className="flex-1 px-6"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Título de sección */}
            <StyledText
              className="text-white text-lg"
              style={{
                fontFamily: fontNames.light,
                fontSize: 20,
                includeFontPadding: false,
              }}
            >
              {t("clasify", "Clasificar")}
            </StyledText>

            {/* Contenedor de campos con distribución equidistante */}
            <StyledView className="flex-1 justify-between">
              {/* Grupo de campos del formulario */}
              <StyledView className="flex-1 justify-evenly">
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
                      <StyledTextInput
                        className="flex-1 text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3]"
                        style={{
                          fontFamily: fontNames.light,
                          fontSize: 16,
                          includeFontPadding: false,
                        }}
                        placeholder={t("forms.magicTitlePlaceholder")}
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        value={trickData.title}
                        onChangeText={handleTitleChange}
                        maxLength={100}
                        autoCapitalize="sentences"
                        autoCorrect={false}
                        returnKeyType="next"
                      />
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
              </StyledView>

              {/* Info Message */}
              <StyledView className="items-center py-6">
                <StyledView className="mb-2">
                  <AntDesign name="Safety" size={32} color="#5BB9A3" />
                </StyledView>

                <StyledText
                  className="text-[#5BB9A3] text-xs mt-2 text-center"
                  style={{
                    fontFamily: fontNames.light,
                    fontSize: 12,
                    includeFontPadding: false,
                  }}
                >
                  {t("info.secureMagic", "Tu magia está")}
                </StyledText>
                <StyledText
                  className="text-[#5BB9A3] text-xs text-center"
                  style={{
                    fontFamily: fontNames.light,
                    fontSize: 12,
                    includeFontPadding: false,
                  }}
                >
                  {t("info.safeEncryption", "Segura & Encriptada")}
                </StyledText>
              </StyledView>
            </StyledView>
          </StyledScrollView>

          {/* Bottom Section */}
          <StyledView className="justify-end pt-6 px-6 pb-6">
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

            {/* Next Step Button */}
            <StyledTouchableOpacity
              className={`w-full py-4 rounded-lg items-center justify-center flex-row ${
                isFormValid && !isSubmitting && !isLastStep
                  ? "bg-[#2C6B5C]"
                  : "bg-transparent border border-[#2C6B5C]"
              }`}
              disabled={!isFormValid || isSubmitting || isLastStep}
              onPress={() => {
                if (isFormValid && onNext) {
                  onNext();
                }
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
