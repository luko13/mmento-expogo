import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import {
  modalStyles,
  blurConfig,
  modalClasses,
} from "../../styles/modalStyles";
import { fontNames } from "../../app/_layout";
import { getUserCategories } from "../../utils/categoryService";
import { supabase } from "../../lib/supabase";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);

// Lista de nombres de categorías reservadas
const RESERVED_CATEGORY_NAMES = [
  "favoritos",
  "favorites",
  "favourites",
  "favorito",
  "favorite",
  "favourite",
];

interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  initialName?: string;
  mode?: "create" | "edit";
  currentCategoryId?: string; // Para excluir la categoría actual al editar
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialName = "",
  mode = "create",
  currentCategoryId,
}) => {
  const { t } = useTranslation();
  const [categoryName, setCategoryName] = useState(initialName);
  const [userId, setUserId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(mode === "create");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Obtener userId del storage cuando se monta el componente
  useEffect(() => {
    const getUserId = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error("Error getting user:", error);
      }
    };
    getUserId();
  }, []);

  useEffect(() => {
    setCategoryName(initialName);
    setIsEditingName(mode === "create");
    setError("");
  }, [initialName, mode, visible]);

  const validateCategoryName = useCallback(
    async (name: string): Promise<string | null> => {
      const trimmedName = name.trim();

      // Validar longitud mínima
      if (trimmedName.length < 3) {
        return t(
          "validation.minLength",
          "Category name must be at least 3 characters"
        );
      }

      // Validar nombres reservados
      if (RESERVED_CATEGORY_NAMES.includes(trimmedName.toLowerCase())) {
        return t(
          "validation.reservedCategory",
          "This category name is reserved and cannot be used"
        );
      }

      // Validar duplicados
      if (userId) {
        try {
          const existingCategories = await getUserCategories(userId);
          const isDuplicate = existingCategories.some(
            (cat) =>
              cat.name.toLowerCase() === trimmedName.toLowerCase() &&
              cat.id !== currentCategoryId // Excluir la categoría actual al editar
          );

          if (isDuplicate) {
            return t(
              "validation.duplicateCategory",
              "A category with this name already exists"
            );
          }
        } catch (error) {
          console.error("Error checking duplicates:", error);
        }
      }

      return null;
    },
    [userId, currentCategoryId, t]
  );

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) return; // Prevenir múltiples envíos

    const trimmedName = categoryName.trim();

    // Validar antes de confirmar
    setIsSubmitting(true);
    const validationError = await validateCategoryName(trimmedName);

    if (validationError) {
      setError(validationError);
      setIsSubmitting(false);
      return;
    }

    // Si todo está bien, confirmar
    try {
      await onConfirm(trimmedName);
      handleClose();
    } catch (error) {
      console.error("Error confirming category:", error);
      setError(t("errors.generic", "An error occurred. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }, [categoryName, isSubmitting, validateCategoryName, onConfirm, t]);

  const handleClose = useCallback(() => {
    setCategoryName(initialName);
    setError("");
    setIsEditingName(false);
    setIsSubmitting(false);
    onClose();
  }, [initialName, onClose]);

  const handleNameChange = (text: string) => {
    setCategoryName(text);
    setError(""); // Limpiar error al escribir
  };

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      <StyledBlurView
        {...blurConfig.backgroundBlur}
        className={modalClasses.backgroundBlur}
      >
        <StyledView className={modalClasses.mainContainer}>
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
                  disabled={isEditingName}
                >
                  {isEditingName ? (
                    <StyledTextInput
                      value={categoryName}
                      onChangeText={handleNameChange}
                      onBlur={() => {
                        if (mode === "edit") {
                          setIsEditingName(false);
                        }
                      }}
                      autoFocus
                      style={{
                        ...modalStyles.pillInput,
                        fontFamily: fontNames.regular,
                        includeFontPadding: false,
                      }}
                      className="text-base"
                      placeholder={t("categoryName", "Category name")}
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      editable={!isSubmitting}
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

              {/* Mensaje de error */}
              {error ? (
                <StyledText
                  className="text-red-400 text-sm text-center mt-2"
                  style={{
                    fontFamily: fontNames.regular,
                    includeFontPadding: false,
                  }}
                >
                  {error}
                </StyledText>
              ) : null}
            </StyledView>

            {/* Acciones */}
            <StyledView
              style={modalStyles.footerContainer}
              className={modalClasses.flexRow}
            >
              <StyledTouchableOpacity
                className={modalClasses.centerContent}
                style={modalStyles.buttonLeft}
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <StyledText
                  className={modalClasses.cancelButtonText}
                  style={{
                    fontFamily: fontNames.medium,
                    fontSize: 16,
                    includeFontPadding: false,
                    opacity: isSubmitting ? 0.5 : 1,
                  }}
                >
                  {t("common.cancel", "Cancel")}
                </StyledText>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                className={modalClasses.centerContent}
                style={modalStyles.buttonRight}
                onPress={handleConfirm}
                disabled={
                  !categoryName.trim() ||
                  categoryName.trim().length < 3 ||
                  isSubmitting
                }
              >
                <StyledText
                  className="text-base font-medium text-white"
                  style={{
                    color:
                      categoryName.trim().length >= 3 && !isSubmitting
                        ? "#ffffff"
                        : "rgba(255, 255, 255, 0.4)",
                    fontFamily: fontNames.medium,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                >
                  {isSubmitting
                    ? t("common.saving", "Saving...")
                    : mode === "create"
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
