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

const screenWidth = Dimensions.get("window").width;

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

  const handleConfirm = () => {
    if (categoryName.trim()) {
      onConfirm(categoryName.trim());
    }
  };

  const handleClose = () => {
    setCategoryName(initialName);
    onClose();
  };

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      <StyledBlurView
        intensity={5}
        tint="dark"
        className="flex-1 justify-center items-center"
      >
        <StyledView className="flex-1 justify-center items-center px-6">
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
            <StyledView className="pt-6 pb-4 px-6">
              {/* Header with editable category pill */}
              <StyledView className="flex-row items-center justify-center mb-4">
                <StyledText className="text-white text-2xl font-light mr-3">
                  {mode === "create"
                    ? t("forms.create", "Create")
                    : t("forms.edit", "Edit")}
                </StyledText>

                {/* Editable Category Pill */}
                <StyledTouchableOpacity
                  onPress={() => setIsEditingName(true)}
                  className="px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: "rgba(104, 104, 104, 0.027)",
                    borderColor: "rgba(255, 255, 255, 0.568)",
                    borderWidth: 1,
                  }}
                >
                  {isEditingName ? (
                    <StyledTextInput
                      value={categoryName}
                      onChangeText={setCategoryName}
                      onBlur={() => setIsEditingName(false)}
                      autoFocus
                      style={{
                        color: "#ffffff",
                        fontWeight: "500",
                        minWidth: 80,
                        textAlign: "center",
                      }}
                      className="text-base"
                      placeholder={t("categoryName", "Category name")}
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    />
                  ) : (
                    <StyledText
                      style={{ color: "#ffffff" }}
                      className="font-medium"
                    >
                      {categoryName || t("categoryName", "Category name")}
                    </StyledText>
                  )}
                </StyledTouchableOpacity>
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
                disabled={!categoryName.trim()}
              >
                <StyledText
                  className="text-base font-medium"
                  style={{
                    color: categoryName.trim()
                      ? "#ffffff"
                      : "rgba(255, 255, 255, 0.4)",
                  }}
                >
                  {mode === "create"
                    ? t("common.create", "Create")
                    : t("common.save", "Save")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledBlurView>
          </StyledBlurView>
        </StyledView>
      </StyledBlurView>
    </StyledModal>
  );
};

export default CategoryModal;
