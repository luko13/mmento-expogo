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
} from "../../styles/modalStyles";
import { fontNames } from "../../app/_layout";
import { getContrastTextColor } from "../../utils/colorUtils";

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

  const textColor = getContrastTextColor(selectedColor);

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
                  style={{
                    backgroundColor: selectedColor + "30",
                    borderWidth: 1,
                    borderColor: textColor + "80",
                  }}
                >
                  {isEditingName ? (
                    <StyledTextInput
                      value={tagName}
                      onChangeText={setTagName}
                      onBlur={() => setIsEditingName(false)}
                      autoFocus
                      style={{
                        color: textColor,
                        fontFamily: fontNames.regular,
                        fontSize: 16,
                        includeFontPadding: false,
                      }}
                      className="text-base"
                      placeholder={t("tagName", "Tag name")}
                      placeholderTextColor={textColor + "80"}
                    />
                  ) : (
                    <StyledText
                      style={{
                        color: textColor,
                        fontFamily: fontNames.medium,
                        fontSize: 16,
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
