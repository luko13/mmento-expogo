import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import ColorPicker from "./ColorPicker";

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

const screenWidth = Dimensions.get("window").width;

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
        intensity={5}
        tint="dark"
        className="flex-1 justify-center items-center"
      >
        <StyledView className="flex-1 justify-center items-center px-3 py-6">
          <StyledBlurView
            className="overflow-hidden"
            intensity={60}
            tint="default"
            style={{
              width: screenWidth * 0.9,
              maxWidth: 400,
              backgroundColor: "rgba(255, 255, 255, 0.25)",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(200, 200, 200, 0.4)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Content */}
            <StyledView className="p-6">
              {/* Header with editable tag pill */}
              <StyledView className="flex-row items-center justify-center mb-6">
                <StyledText className="text-white text-2xl font-light mr-3">
                  {mode === "create" ? t("forms.create", "Create") : t("forms.edit", "Edit")}
                </StyledText>

                {/* Editable Tag Pill */}
                <StyledTouchableOpacity
                  onPress={() => setIsEditingName(true)}
                  className="px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: selectedColor + "30",
                    borderColor: COLOR_MAPPINGS[selectedColor] || selectedColor,
                    borderWidth: 1,
                  }}
                >
                  {isEditingName ? (
                    <StyledTextInput
                      value={tagName}
                      onChangeText={setTagName}
                      onBlur={() => setIsEditingName(false)}
                      autoFocus
                      style={{
                        color: COLOR_MAPPINGS[selectedColor] || selectedColor,
                        fontWeight: "500",
                        minWidth: 80,
                        textAlign: "center",
                      }}
                      className="text-base"
                      placeholder={t("tagName", "Tag name")}
                      placeholderTextColor={COLOR_MAPPINGS[selectedColor] || selectedColor}
                    />
                  ) : (
                    <StyledText
                      style={{
                        color: COLOR_MAPPINGS[selectedColor] || selectedColor,
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
                <StyledText className="text-white/60 text-sm mb-4">
                  {t("forms.selectColor", "Select a color")}
                </StyledText>

                <ColorPicker
                  selectedColor={selectedColor}
                  onColorSelect={setSelectedColor}
                />
              </StyledView>
            </StyledView>

            {/* Actions */}
            <StyledBlurView
              className="flex-row overflow-hidden"
              style={{ height: 56 }}
              intensity={60}
              tint="default"
            >
              <StyledTouchableOpacity
                className="flex-1 justify-center items-center"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderTopWidth: 1,
                  borderRightWidth: 0.5,
                  borderColor: "rgba(200, 200, 200, 0.4)",
                }}
                onPress={handleClose}
              >
                <StyledText className="text-white/60 text-base font-light">
                  {t("common.cancel", "Cancel")}
                </StyledText>
              </StyledTouchableOpacity>
              <StyledTouchableOpacity
                className="flex-1 justify-center items-center"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderTopWidth: 1,
                  borderLeftWidth: 0.5,
                  borderColor: "rgba(200, 200, 200, 0.4)",
                }}
                onPress={handleConfirm}
                disabled={!tagName.trim()}
              >
                <StyledText 
                  className="text-base font-medium"
                  style={{
                    color: tagName.trim() ? "#ffffff" : "rgba(255, 255, 255, 0.4)"
                  }}
                >
                  {mode === "create" ? t("common.create", "Create") : t("common.save", "Save")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledBlurView>
          </StyledBlurView>
        </StyledView>
      </StyledBlurView>
    </StyledModal>
  );
};

export default TagModal;