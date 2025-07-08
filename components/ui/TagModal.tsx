import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal } from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import ColorPicker from "./ColorPicker";
import {
  modalStyles,
  blurConfig,
  modalClasses,
  getTagPillStyle,
  getTagPillTextStyle,
} from "../../styles/modalStyles";
import { fontNames } from "../../app/_layout";

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
}

const COLOR_MAPPINGS: { [key: string]: string } = {
  // Verde
  "#4CAF50": "#C8E6C9",
  "#1B5E20": "#C8E6C9",
  // Azul
  "#2196F3": "#BBDEFB",
  "#0D47A1": "#BBDEFB",
  // Naranja
  "#FF9800": "#FFE0B2",
  "#E65100": "#FFE0B2",
  // Morado
  "#9C27B0": "#E1BEE7",
  "#4A148C": "#E1BEE7",
  // Rojo
  "#F44336": "#FFCDD2",
  "#B71C1C": "#FFCDD2",
  // Grises
  "#9E9E9E": "#F5F5F5",
  "#424242": "#F5F5F5",
};

const TagModal: React.FC<TagModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialName = "",
  initialColor = "#4CAF50",
  mode = "create",
}) => {
  const { t } = useTranslation();
  const [tagName, setTagName] = useState(initialName);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    setTagName(initialName);
    setSelectedColor(initialColor);
  }, [initialName, initialColor]);

  const handleConfirm = () => {
    if (tagName.trim()) {
      onConfirm(tagName.trim(), selectedColor);
    }
  };

  const handleClose = () => {
    setTagName(initialName);
    setSelectedColor(initialColor);
    onClose();
  };

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      <StyledBlurView
        {...blurConfig.backgroundBlur}
        experimentalBlurMethod="dimezisBlurView"
        className={modalClasses.backgroundBlur}
      >
        <StyledView className={modalClasses.mainContainerWithPadding}>
          <StyledBlurView
            {...blurConfig.containerBlur}
            experimentalBlurMethod="dimezisBlurView"
            className={modalClasses.containerBlur}
            style={modalStyles.modalContainer}
          >
            {/* Content */}
            <StyledView className="p-6">
              {/* Header with editable tag pill */}
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
                  onPress={() => setIsEditingName(true)}
                  className="px-4 py-2 rounded-full"
                  style={getTagPillStyle(
                    selectedColor,
                    COLOR_MAPPINGS[selectedColor]
                  )}
                >
                  {isEditingName ? (
                    <StyledTextInput
                      value={tagName}
                      onChangeText={setTagName}
                      onBlur={() => setIsEditingName(false)}
                      autoFocus
                      style={{
                        ...getTagPillTextStyle(
                          selectedColor,
                          COLOR_MAPPINGS[selectedColor]
                        ),
                        fontFamily: fontNames.regular,
                        includeFontPadding: false,
                      }}
                      className="text-base"
                      placeholder={t("tagName", "Tag name")}
                      placeholderTextColor={
                        COLOR_MAPPINGS[selectedColor] || selectedColor
                      }
                    />
                  ) : (
                    <StyledText
                      style={{
                        color: COLOR_MAPPINGS[selectedColor] || selectedColor,
                        fontFamily: fontNames.medium,
                        includeFontPadding: false,
                      }}
                      className="font-medium"
                    >
                      {tagName || t("tagName", "Tag name")}
                    </StyledText>
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
        </StyledView>
      </StyledBlurView>
    </StyledModal>
  );
};

export default TagModal;
