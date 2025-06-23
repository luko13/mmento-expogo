import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
} from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { modalStyles, blurConfig, modalClasses } from "../../styles/modalStyles";
import { fontNames } from "../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);

interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  initialName?: string;
  mode?: "create" | "edit";
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialName = "",
  mode = "create",
}) => {
  const { t } = useTranslation();
  const [categoryName, setCategoryName] = useState(initialName);
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    setCategoryName(initialName);
  }, [initialName]);

  const handleConfirm = useCallback(() => {
    const trimmed = categoryName.trim();
    if (trimmed) {
      onConfirm(trimmed);
    }
  }, [categoryName, onConfirm]);

  const handleClose = useCallback(() => {
    setCategoryName(initialName);
    onClose();
  }, [initialName, onClose]);

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      {/* Fondo general desenfocado */}
      <StyledBlurView
        {...blurConfig.backgroundBlur}
        className={modalClasses.backgroundBlur}
      >
        <StyledView className={modalClasses.mainContainer}>
          {/* Caja contenedora con Blur + semitransparencia */}
          <StyledBlurView
            {...blurConfig.containerBlur}
            className={modalClasses.containerBlur}
            style={modalStyles.modalContainer}
          >
            {/* Encabezado + Input */}
            <StyledView className="pt-6 pb-4 px-6">
              <StyledView className="flex-row items-center justify-center mb-4">
                <StyledText 
                  className={`${modalClasses.titleText} mr-3`}
                  style={{
                    fontFamily: fontNames.semiBold,
                    fontSize: 18,
                    includeFontPadding: false,
                  }}
                >
                  {mode === "create"
                    ? t("forms.create", "Create")
                    : t("forms.edit", "Edit")}
                </StyledText>

                {/* Píldora editable del nombre */}
                <StyledTouchableOpacity
                  onPress={() => setIsEditingName(true)}
                  className="px-4 py-2 rounded-lg"
                  style={modalStyles.pillContainer}
                >
                  {isEditingName ? (
                    <StyledTextInput
                      value={categoryName}
                      onChangeText={setCategoryName}
                      onBlur={() => setIsEditingName(false)}
                      autoFocus
                      style={{
                        ...modalStyles.pillInput,
                        fontFamily: fontNames.regular,
                        includeFontPadding: false,
                      }}
                      className="text-base"
                      placeholder={t("categoryName", "Category name")}
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    />
                  ) : (
                    <StyledText 
                      style={{
                        ...modalStyles.pillText,
                        fontFamily: fontNames.medium,
                        includeFontPadding: false,
                      }} 
                      className="font-medium"
                    >
                      {categoryName || t("categoryName", "Category name")}
                    </StyledText>
                  )}
                </StyledTouchableOpacity>
              </StyledView>
            </StyledView>

            {/* Acciones */}
            <StyledView style={modalStyles.footerContainer} className={modalClasses.flexRow}>
              <StyledTouchableOpacity
                className={modalClasses.centerContent}
                style={modalStyles.buttonLeft}
                onPress={handleClose}
              >
                <StyledText 
                  className={modalClasses.cancelButtonText}
                  style={{
                    fontFamily: fontNames.medium,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                >
                  {t("common.cancel", "Cancel")}
                </StyledText>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                className={modalClasses.centerContent}
                style={modalStyles.buttonRight}
                onPress={handleConfirm}
                disabled={!categoryName.trim()}
              >
                <StyledText
                  className="text-base font-medium text-white"
                  style={{
                    color: categoryName.trim()
                      ? "#ffffff"
                      : "rgba(255, 255, 255, 1)",
                    fontFamily: fontNames.medium,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                >
                  {mode === "create"
                    ? t("common.create", "Create")
                    : t("common.save", "Save")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledBlurView>
        </StyledView>
      </StyledBlurView>
    </StyledModal>
  );
};

export default React.memo(CategoryModal);
