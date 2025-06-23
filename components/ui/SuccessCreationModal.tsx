import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import { modalStyles, blurConfig, modalClasses } from "../../styles/modalStyles";
import { fontNames } from "../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);

interface SuccessCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onViewItem: () => void;
  onAddAnother: () => void;
  itemName: string;
  itemType: "trick" | "technique" | "gimmick";
}

const SuccessCreationModal: React.FC<SuccessCreationModalProps> = ({
  visible,
  onClose,
  onViewItem,
  onAddAnother,
  itemName,
  itemType,
}) => {
  const { t } = useTranslation();

  const getItemTypeText = () => {
    switch (itemType) {
      case "trick":
        return t("common.trick", "trick");
      case "technique":
        return t("common.technique", "technique");
      case "gimmick":
        return t("common.gimmick", "gimmick");
      default:
        return t("common.item", "item");
    }
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
            {/* Content */}
            <StyledView className="px-6 pt-8 pb-6">
              {/* Success Icon */}
              <StyledView className="items-center mb-6">
                <StyledView className="w-16 h-16 rounded-full items-center justify-center">
                  <Feather name="check" size={64} color="#10b981" />
                </StyledView>
              </StyledView>

              {/* Success Message */}
              <StyledText 
                className="text-white/90 text-xl text-center -mb-1"
                style={{
                  fontFamily: fontNames.regular,
                  fontSize: 20,
                  includeFontPadding: false,
                }}
              >
                <StyledText 
                  className={`font-medium ${modalClasses.successButtonText}`}
                  style={{
                    fontFamily: fontNames.medium,
                    fontSize: 20,
                    includeFontPadding: false,
                  }}
                >
                  {itemName}
                </StyledText>{" "}
                {t("successCreation.hasBeenCreated", "has been created")}
              </StyledText>

              <StyledText 
                className={modalClasses.subtitleText}
                style={{
                  fontFamily: fontNames.regular,
                  fontSize: 16,
                  includeFontPadding: false,
                }}
              >
                {t(
                  "successCreation.andEncrypted",
                  "and encrypted successfully"
                )}
              </StyledText>
            </StyledView>

            {/* Divider */}
            <StyledView style={modalStyles.divider} />

            {/* Actions */}
            <StyledView>
              {/* View Item Button */}
              <StyledTouchableOpacity
                className="py-3 items-center"
                style={modalStyles.actionButton}
                onPress={onViewItem}
              >
                <StyledText 
                  className={modalClasses.buttonTextBold}
                  style={{
                    fontFamily: fontNames.semiBold,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                >
                  {t("successCreation.view", "View")}{" "}
                  <StyledText 
                    className={`font-medium text-base ${modalClasses.successButtonText}`}
                    style={{
                      fontFamily: fontNames.medium,
                      fontSize: 16,
                      includeFontPadding: false,
                    }}
                  >
                    {itemName}
                  </StyledText>
                </StyledText>
              </StyledTouchableOpacity>

              {/* Register More Button */}
              <StyledTouchableOpacity
                className="py-3 items-center"
                style={modalStyles.actionButton}
                onPress={onAddAnother}
              >
                <StyledText 
                  className={modalClasses.buttonText}
                  style={{
                    fontFamily: fontNames.regular,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                >
                  {t("successCreation.registerMore", "Register more")}
                </StyledText>
              </StyledTouchableOpacity>

              {/* Done Button */}
              <StyledTouchableOpacity
                className="py-3 items-center"
                onPress={onClose}
              >
                <StyledText 
                  className="text-white/50 text-base font-light"
                  style={{
                    fontFamily: fontNames.light,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                >
                  {t("successCreation.done", "Done")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledBlurView>
        </StyledView>
      </StyledBlurView>
    </StyledModal>
  );
};

export default SuccessCreationModal;