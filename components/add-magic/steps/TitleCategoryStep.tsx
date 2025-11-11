// components/add-magic/steps/TitleCategoryStep.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
import QuickSaveModal from "../../ui/QuickSaveModal";
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
  const [showQuickSaveModal, setShowQuickSaveModal] = useState(false);
  const titleScrollViewRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);

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
    if (trimmed.length > 40) {
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

  // Efecto para hacer scroll al final cuando el texto cambia
  useEffect(() => {
    if (trickData.title && titleScrollViewRef.current) {
      // Pequeño delay para permitir que el layout se actualice
      setTimeout(() => {
        titleScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [trickData.title]);

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
          <StyledView className="mb-4" style={{ paddingHorizontal: 12 }}>
            <StyledView style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              {/* Botón X - ancho fijo */}
              <StyledTouchableOpacity className="p-2" onPress={onCancel} style={{ width: 40, flexShrink: 0 }}>
                <Feather name="x" size={24} color="white" />
              </StyledTouchableOpacity>

              {/* Título - con ancho máximo forzado */}
              <StyledView style={{ flex: 1, paddingHorizontal: 8, maxWidth: width - 104 }}>
                <Text
                  style={{
                    fontFamily: fontNames.light,
                    fontSize: 20,
                    color: 'white',
                    textAlign: 'center',
                    includeFontPadding: false,
                  }}
                >
                  {isEditMode
                    ? t("forms.editMagic", "Editar Magia")
                    : t("forms.registerMagic", "Registrar Item Mágico")}
                </Text>
              </StyledView>

              {/* Botón Check - ancho fijo */}
              <StyledTouchableOpacity
                className={`p-2 ${
                  !isFormValid || isSubmitting ? "opacity-30" : ""
                }`}
                style={{ width: 40, flexShrink: 0 }}
                onPress={() => {
                  if (isFormValid && !isSubmitting) {
                    setShowQuickSaveModal(true);
                  }
                }}
                disabled={!isFormValid || isSubmitting}
              >
                <Feather
                  name={isSubmitting ? "loader" : "check"}
                  size={24}
                  color="white"
                />
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
                  <StyledView className="flex-1 h-12 bg-[#D4D4D4]/10 border border-[#5bb9a3] rounded-lg flex-row items-center pr-2 overflow-hidden">
                    <StyledScrollView
                      ref={titleScrollViewRef}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      style={{ flex: 1 }}
                      contentContainerStyle={{ flexGrow: 1 }}
                    >
                      <StyledTextInput
                        ref={titleInputRef}
                        className="text-[#FFFFFF]/70 bg-transparent"
                        style={{
                          fontFamily: fontNames.light,
                          fontSize: 16,
                          height: 48, // altura fija
                          lineHeight: 22, // no corta descendentes
                          paddingVertical: 0, // sin padding vertical
                          paddingLeft: 14, // inset real: evita mordisco y ALINEA con Category/Tag
                          paddingRight: 14, // padding derecho para balancear
                          minWidth: '100%', // ocupa al menos el ancho completo
                          includeFontPadding: false,
                          ...(Platform.OS === "android"
                            ? { textAlignVertical: "center" as any }
                            : { paddingTop: 1 }), // iOS baseline fino
                        }}
                        placeholder={`${t("forms.magicTitlePlaceholder")}`}
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        value={trickData.title}
                        onChangeText={handleTitleChange}
                        maxLength={40}
                        autoCapitalize="sentences"
                        autoCorrect={false}
                        returnKeyType="next"
                        allowFontScaling={false}
                        multiline={false}
                        numberOfLines={1}
                        scrollEnabled={false}
                      />
                    </StyledScrollView>
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

        {/* Modal de confirmación de guardado rápido */}
        <QuickSaveModal
          visible={showQuickSaveModal}
          onClose={() => setShowQuickSaveModal(false)}
          onConfirm={() => {
            setShowQuickSaveModal(false);
            if (onSave) onSave();
          }}
        />
      </StyledView>
    </TouchableWithoutFeedback>
  );
}
