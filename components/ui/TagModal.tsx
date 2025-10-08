import React, { useState, useEffect, useRef, useMemo } from "react";
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
import ColorPicker from "./ColorPicker";
import {
  modalStyles,
  blurConfig,
  modalClasses,
} from "../../styles/modalStyles";
import { fontNames } from "../../app/_layout";
import { getContrastTextColor } from "../../utils/colorUtils";
import BlinkingCursor from "./BlinkingCursor";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);

interface TagModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (name: string, color: string) => void;
  initialName?: string;
  initialColor?: string;
  mode?: "create" | "edit";
  placeholderText?: string;
}

const TagModal: React.FC<TagModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialName = "",
  initialColor = "#4CAF50",
  mode = "create",
  placeholderText,
}) => {
  const { t } = useTranslation();
  const [tagName, setTagName] = useState(initialName);
  const [selectedColor, setSelectedColor] = useState(initialColor);

  // Arrancamos SIN edición para mostrar barrita en "reposo"
  const [isEditingName, setIsEditingName] = useState(false);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTagName(initialName);
    setSelectedColor(initialColor);
    // En modo create: si hay initialName (texto pre-llenado), entramos directo a edición
    // En modo edit: siempre empezamos sin editar (mostramos píldora)
    setIsEditingName(mode === "create" && initialName.trim().length > 0);
  }, [initialName, initialColor, mode, visible]);

  // Parpadeo:
  // - create: si NO editando y está vacío
  // - edit:   si NO editando (aunque haya texto)
  const shouldShowBlink = useMemo(() => {
    if (!visible || isEditingName) return false;
    if (mode === "edit") return true;
    return tagName.trim().length === 0;
  }, [visible, isEditingName, mode, tagName]);

  const handleConfirm = () => {
    const trimmed = tagName.trim();
    if (trimmed) onConfirm(trimmed, selectedColor);
  };

  const handleClose = () => {
    setTagName(initialName);
    setSelectedColor(initialColor);
    setIsEditingName(false);
    onClose();
  };

  const textColor = getContrastTextColor(selectedColor);

  const enterEdit = () => {
    setIsEditingName(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      <StyledBlurView
        {...blurConfig.backgroundBlur}
        experimentalBlurMethod="dimezisBlurView"
        className={modalClasses.backgroundBlur}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={handleClose}
        >
          <StyledView className={modalClasses.mainContainerWithPadding}>
            <Pressable onPress={(e) => e.stopPropagation()}>
          {/* Wrapper con sombras + radio (no overflow hidden) */}
          <View style={modalStyles.modalCardShadow}>
            {/* Blur recortado con radio */}
            <StyledBlurView
              {...blurConfig.containerBlur}
              experimentalBlurMethod="dimezisBlurView"
              className={modalClasses.containerBlur}
              style={modalStyles.modalCardBlur}
            >
              {/* Content */}
              <StyledView className="p-6">
                {/* Header con píldora editable */}
                <StyledView className="flex-row items-center justify-center mb-6">
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

                  {/* Editable Tag Pill */}
                  <StyledTouchableOpacity
                    onPress={enterEdit}
                    className="px-4 py-2 rounded-full"
                    style={{
                      backgroundColor: selectedColor + "30",
                      borderWidth: 1,
                      borderColor: textColor + "80",
                      overflow: "visible",
                    }}
                    disabled={isEditingName}
                  >
                    {isEditingName ? (
                      <StyledView className="flex-row items-center justify-start" style={{ minWidth: 140 }}>
                        <StyledTextInput
                          ref={inputRef}
                          value={tagName}
                          onChangeText={setTagName}
                          onBlur={() => {
                            if (mode === "edit") setIsEditingName(false);
                          }}
                          style={{
                            color: textColor,
                            fontFamily: fontNames.medium,
                            fontSize: 16,
                            includeFontPadding: false,
                            minWidth: 140,
                            textAlign: "left",
                            paddingVertical: 0,
                            paddingHorizontal: 0,
                            margin: 0,
                          }}
                          placeholder={t("tagName", "Tag name")}
                          placeholderTextColor={textColor + "80"}
                        />
                      </StyledView>
                    ) : (
                      // Vista "reposo" con barrita parpadeante inline
                      <StyledView
                        className="flex-row items-center justify-start"
                        style={{ gap: 6, minWidth: 140 }}
                      >
                        <BlinkingCursor
                          visible={shouldShowBlink}
                          color={textColor}
                        />

                        <StyledText
                          style={{
                            color: textColor,
                            fontFamily: fontNames.medium,
                            fontSize: 16,
                            includeFontPadding: false,
                            opacity:
                              mode === "create" && tagName.trim().length === 0
                                ? 0.7
                                : 1,
                            marginLeft: 0,
                          }}
                          className="font-medium"
                          numberOfLines={1}
                        >
                          {tagName || `${placeholderText || t("tagName", "Tag name")}`}
                        </StyledText>
                      </StyledView>
                    )}
                  </StyledTouchableOpacity>
                </StyledView>

                {/* Color Picker Section */}
                <StyledView className="mb-6 -m-3">
                  <StyledText
                    className={modalClasses.subtitleTextSmall}
                    style={{
                      fontFamily: fontNames.regular,
                      fontSize: 14,
                      includeFontPadding: false,
                    }}
                  >
                    {t("forms.selectColor", "Select a color")}
                  </StyledText>

                  <ColorPicker
                    selectedColor={selectedColor}
                    onColorSelect={setSelectedColor}
                  />
                </StyledView>
              </StyledView>

              {/* Actions */}
              <StyledView
                className={`${modalClasses.flexRow}`}
                style={modalStyles.footerContainer}
              >
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
                  disabled={!tagName.trim()}
                >
                  <StyledText
                    className="text-base font-medium"
                    style={{
                      color: tagName.trim()
                        ? "#ffffff"
                        : "rgba(255, 255, 255, 0.4)",
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
          </View>
            </Pressable>
          </StyledView>
        </Pressable>
      </StyledBlurView>
    </StyledModal>
  );
};

export default TagModal;
