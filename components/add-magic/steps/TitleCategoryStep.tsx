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
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import {
  Feather,
  Ionicons,
  FontAwesome6,
  MaterialIcons,
  AntDesign,
} from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import type { MagicTrick } from "../../../types/magicTrick";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TagSelector from "../../../components/ui/TagSelector";
import CategorySelector from "../../../components/ui/CategorySelector";
import CustomTooltip from "../../ui/Tooltip";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);

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

  return (
    <StyledView className="flex-1">
      <StyledView className="flex-1" style={{ paddingTop: 15 }}>
        {/* Header */}
        <StyledView className="flex-row items-center justify-between px-6 mb-4">
          <StyledTouchableOpacity className="p-2" onPress={onCancel}>
            <Feather name="x" size={24} color="white" />
          </StyledTouchableOpacity>

          <StyledView className="flex-1 items-center">
            <StyledText className="text-white text-lg font-semibold">
              {t("forms.registerMagic")}
            </StyledText>
            <StyledText className="text-emerald-200 text-sm opacity-70">
              {getCurrentDate()}
            </StyledText>
          </StyledView>

          <StyledTouchableOpacity className="p-2 opacity-0">
            <Feather name="x" size={24} color="white" />
          </StyledTouchableOpacity>
        </StyledView>

        {/* Form Container */}
        <StyledView className="flex-1 px-6">
          {/* Título de sección */}
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
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
                      <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                        <FontAwesome6
                          name="wand-magic-sparkles"
                          size={18}
                          color="white"
                        />
                      </StyledView>
                    </CustomTooltip>
                    <StyledTextInput
                      className="flex-1 text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3]"
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
                    <StyledText className="text-red-400 text-xs ml-11 mt-1">
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
                      <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
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
                      <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
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
                <MaterialIcons
                  name="cloud-upload"
                  size={32}
                  color="#10b9813b"
                />
              </StyledView>

              <StyledText className="text-[#10b981]/40 text-xs mt-2 text-center">
                {t(
                  "info.filesCompressed",
                  "Los archivos se comprimen automáticamente"
                )}
              </StyledText>
              <StyledText className="text-[#10b981]/40 text-xs text-center">
                {t(
                  "info.savingStorage",
                  "para ahorrar espacio de almacenamiento"
                )}
              </StyledText>
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Bottom Section */}
        <StyledView
          className="px-6"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {/* Step indicator */}
          <StyledText className="text-white/60 text-center text-sm mb-4">
            {t("navigation.stepIndicator", {
              current: currentStep,
              total: totalSteps,
            })}
          </StyledText>

          {/* Buttons Container */}
          <StyledView className="flex-row space-x-3">
            {/* Save Button */}
            <StyledTouchableOpacity
              className={`flex-1 py-4 rounded-lg items-center justify-center flex-row ${
                isFormValid && !isSubmitting
                  ? "bg-white/10 "
                  : "bg-transparent border border-[#5bb9a3]/50"
              }`}
              disabled={!isFormValid || isSubmitting}
              onPress={() => {
                if (isFormValid && onSave) {
                  onSave();
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <StyledText className="text-white font-semibold text-base mr-2">
                    {t("actions.saving")}
                  </StyledText>
                  <Ionicons name="refresh" size={20} color="white" />
                </>
              ) : (
                <>
                  <StyledText className="text-white font-semibold text-base mr-2">
                    {t("actions.save")}
                  </StyledText>
                  <AntDesign name="check" size={20} color="white" />
                </>
              )}
            </StyledTouchableOpacity>

            {/* Next Button */}
            <StyledTouchableOpacity
              className={`flex-1 py-4 rounded-lg items-center justify-center flex-row ${
                isFormValid && !isSubmitting ? "bg-emerald-700" : "bg-white/10"
              }`}
              disabled={!isFormValid || isSubmitting || isLastStep}
              onPress={() => {
                if (isFormValid && onNext) {
                  onNext();
                }
              }}
            >
              <StyledText className="text-white font-semibold text-base mr-2">
                {t("actions.content", "Content")}
              </StyledText>
              <Feather name="chevron-right" size={20} color="white" />
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledView>
  );
}
