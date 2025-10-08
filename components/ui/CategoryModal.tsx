import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
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
import BlinkingCursor from "./BlinkingCursor";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);

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
  currentCategoryId?: string;
  placeholderText?: string;
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialName = "",
  mode = "create",
  currentCategoryId,
  placeholderText,
}) => {
  const { t } = useTranslation();
  const [categoryName, setCategoryName] = useState(initialName);
  const [userId, setUserId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) setUserId(user.id);
      } catch (e) {
        console.error("Error getting user:", e);
      }
    })();
  }, []);

  useEffect(() => {
    setCategoryName(initialName);
    setError("");
    setIsFocused(false);
    // En modo create: si hay initialName (texto pre-llenado), entramos directo a edición
    // En modo edit: siempre empezamos sin editar (mostramos píldora)
    setIsEditingName(mode === "create" && initialName.trim().length > 0);
  }, [initialName, mode, visible]);

  // create: parpadea si vacío y no editando
  // edit:   parpadea siempre que no edites
  const shouldShowBlink = useMemo(() => {
    if (!visible || isSubmitting || isEditingName) return false;
    if (mode === "edit") return true;
    return categoryName.trim().length === 0;
  }, [visible, isSubmitting, isEditingName, mode, categoryName]);

  const validateCategoryName = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (trimmed.length < 3)
        return t(
          "validation.minLength",
          "Category name must be at least 3 characters"
        );
      if (RESERVED_CATEGORY_NAMES.includes(trimmed.toLowerCase()))
        return t(
          "validation.reservedCategory",
          "This category name is reserved and cannot be used"
        );
      if (userId) {
        try {
          const existing = await getUserCategories(userId);
          const dup = existing.some(
            (cat) =>
              cat.name.toLowerCase() === trimmed.toLowerCase() &&
              cat.id !== currentCategoryId
          );
          if (dup)
            return t(
              "validation.duplicateCategory",
              "A category with this name already exists"
            );
        } catch (e) {
          console.error("Error checking duplicates:", e);
        }
      }
      return null;
    },
    [userId, currentCategoryId, t]
  );

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) return;
    const trimmed = categoryName.trim();
    setIsSubmitting(true);
    const validationError = await validateCategoryName(trimmed);
    if (validationError) {
      setError(validationError);
      setIsSubmitting(false);
      return;
    }
    try {
      await onConfirm(trimmed);
      handleClose();
    } catch (e) {
      console.error("Error confirming category:", e);
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
    setIsFocused(false);
    onClose();
  }, [initialName, onClose]);

  const handleNameChange = (text: string) => {
    setCategoryName(text);
    setError("");
  };

  const handlePillPress = () => {
    setIsEditingName(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      <StyledBlurView
        {...blurConfig.backgroundBlur}
        className={modalClasses.backgroundBlur}
        experimentalBlurMethod="dimezisBlurView"
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={handleClose}
        >
          <StyledView className={modalClasses.mainContainer}>
            <Pressable onPress={(e) => e.stopPropagation()}>
          {/* ⬇ wrapper con sombras y radio */}
          <View style={modalStyles.modalCardShadow}>
            {/* ⬇ Blur que recorta el radio (overflow hidden aquí) */}
            <StyledBlurView
              {...blurConfig.containerBlur}
              experimentalBlurMethod="dimezisBlurView"
              className={modalClasses.containerBlur}
              style={modalStyles.modalCardBlur}
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

                  {/* Píldora editable */}
                  <StyledTouchableOpacity
                    onPress={handlePillPress}
                    className="px-4 py-2 rounded-lg"
                    style={[
                      { overflow: "visible" },
                      /* base de pill: */ {
                        backgroundColor: "rgba(104,104,104,0.027)",
                        borderColor: "rgba(255, 255, 255, 0.568)",
                        borderWidth: 1,
                        borderRadius: 8,
                      },
                    ]}
                    disabled={isEditingName}
                  >
                    <StyledView
                      className="flex-row items-center justify-start"
                      style={{ minWidth: 140, height: 28, gap: 6 }}
                    >
                      {isEditingName ? (
                        <StyledTextInput
                          ref={inputRef}
                          value={categoryName}
                          onChangeText={handleNameChange}
                          onFocus={() => setIsFocused(true)}
                          onBlur={() => {
                            setIsFocused(false);
                            if (mode === "edit") setIsEditingName(false);
                          }}
                          style={{
                            color: "#fff",
                            fontFamily: fontNames.medium,
                            fontSize: 16,
                            minWidth: 80,
                            textAlign: "left",
                            includeFontPadding: false,
                            paddingVertical: 0,
                            paddingHorizontal: 0,
                            margin: 0,
                          }}
                          placeholder={t("categoryName", "Category name")}
                          placeholderTextColor="rgba(255,255,255,0.5)"
                          editable={!isSubmitting}
                        />
                      ) : (
                        <>
                          <BlinkingCursor visible={shouldShowBlink} />

                          <StyledText
                            style={{
                              color: "#fff",
                              fontFamily: fontNames.medium,
                              fontSize: 16,
                              includeFontPadding: false,
                              opacity:
                                mode === "create" &&
                                categoryName.trim().length === 0
                                  ? 0.6
                                  : 1,
                              marginLeft: 0,
                            }}
                            className="font-medium"
                            numberOfLines={1}
                          >
                            {categoryName || `${placeholderText || t("categoryName", "Category name")}`}
                          </StyledText>
                        </>
                      )}
                    </StyledView>
                  </StyledTouchableOpacity>
                </StyledView>

                {/* Error */}
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
                  style={{
                    borderRightWidth: 0.5,
                    borderColor: "rgba(200,200,200,0.4)",
                  }}
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
          </View>
            </Pressable>
          </StyledView>
        </Pressable>
      </StyledBlurView>
    </StyledModal>
  );
};

export default React.memo(CategoryModal);
