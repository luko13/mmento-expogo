import React from "react";
import { View, Text, TouchableOpacity, Modal, Dimensions } from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);

interface CategoryNotEmptyModalProps {
  visible: boolean;
  onClose: () => void;
  categoryName?: string;
  itemCount?: number;
}

const screenWidth = Dimensions.get("window").width;

const CantDeleteModal: React.FC<CategoryNotEmptyModalProps> = ({
  visible,
  onClose,
  categoryName,
  itemCount,
}) => {
  const { t } = useTranslation();

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
            <StyledView className="px-6 py-5">
              <StyledText className="text-white/90 text-2xl font-light text-center">
                {t("categoryNotEmpty.title", "Can't delete category")}
              </StyledText>

              <StyledText className="text-white/60 text-base text-center mt-3">
                {t(
                  "categoryNotEmpty.message",
                  "You need to move or delete all items in this category first."
                )}
              </StyledText>

              {itemCount !== undefined && itemCount > 0 && (
                <StyledText className="text-white/40 text-sm text-center mt-2">
                  {itemCount}{" "}
                  {itemCount === 1
                    ? t("common.item", "item")
                    : t("common.items", "items")}{" "}
                  {t("common.found", "found")}
                </StyledText>
              )}
            </StyledView>

            {/* Single Action Button */}
            <StyledBlurView
              className="overflow-hidden"
              style={{ height: 52 }}
              intensity={60}
              tint="default"
            >
              <StyledTouchableOpacity
                className="flex-1 justify-center items-center"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderTopWidth: 1,
                  borderColor: "rgba(200, 200, 200, 0.4)",
                }}
                onPress={onClose}
              >
                <StyledText className="text-white/80 text-base font-medium">
                  {t("common.ok", "OK")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledBlurView>
          </StyledBlurView>
        </StyledView>
      </StyledBlurView>
    </StyledModal>
  );
};

export default CantDeleteModal;
