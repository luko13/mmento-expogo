import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import {
  modalStyles,
  blurConfig,
  modalClasses,
} from "../../styles/modalStyles";
import { fontNames } from "../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);

interface DeleteModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
  itemType?: string;
  customMessage?: string;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  visible,
  onClose,
  onConfirm,
  itemName,
  itemType,
  customMessage,
}) => {
  const { t } = useTranslation();

  const getDeleteMessage = () => {
    if (customMessage) return customMessage;

    if (itemName && itemType) {
      return `${t("common.delete", "Delete")} ${itemName}?`;
    }

    return t("common.confirmDelete", "This action can't be undone.");
  };

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      <StyledBlurView
        {...blurConfig.backgroundBlurDark}
        experimentalBlurMethod="dimezisBlurView"
        className={modalClasses.backgroundBlur}
      >
        <StyledView className={modalClasses.mainContainer}>
          <StyledBlurView
            {...blurConfig.containerBlur}
            experimentalBlurMethod="dimezisBlurView"
            className={modalClasses.containerBlur}
            style={modalStyles.modalContainer}
          >
            {/* Content */}
            <StyledView className="px-6 py-5">
              <StyledText
                className={modalClasses.titleTextWithOpacity}
                style={{
                  fontFamily: fontNames.semiBold,
                  fontSize: 18,
                  includeFontPadding: false,
                }}
              >
                {getDeleteMessage().split("?")[0]}
                {itemName && itemType && (
                  <>
                    <StyledText
                      className="text-white font-medium"
                      style={{
                        fontFamily: fontNames.medium,
                        fontSize: 18,
                        includeFontPadding: false,
                      }}
                    >
                      {itemName}
                    </StyledText>
                    <StyledText
                      className="text-white/90"
                      style={{
                        fontFamily: fontNames.semiBold,
                        fontSize: 18,
                        includeFontPadding: false,
                      }}
                    >
                      ?
                    </StyledText>
                  </>
                )}
              </StyledText>

              <StyledText
                className={`${modalClasses.subtitleTextSmall} mt-2`}
                style={{
                  fontFamily: fontNames.regular,
                  fontSize: 14,
                  includeFontPadding: false,
                }}
              >
                {t("common.cantUndo", "This action can't be undone.")}
              </StyledText>
            </StyledView>

            {/* Actions */}
            <StyledView
              className={`${modalClasses.flexRow}`}
              style={modalStyles.footerContainerCompact}
            >
              <StyledTouchableOpacity
                className={modalClasses.centerContent}
                style={modalStyles.buttonLeft}
                onPress={onClose}
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
                onPress={onConfirm}
              >
                <StyledText
                  className={modalClasses.deleteButtonText}
                  style={{
                    fontFamily: fontNames.medium,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                >
                  {t("common.delete", "Delete")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledBlurView>
        </StyledView>
      </StyledBlurView>
    </StyledModal>
  );
};

export default DeleteModal;
