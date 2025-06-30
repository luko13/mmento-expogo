import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
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

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);

interface TrickActionsModalProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onPrivacy: () => void;
  onDelete: () => void;
  isPublic?: boolean;
  isOwner?: boolean;
}

const TrickActionsModal: React.FC<TrickActionsModalProps> = ({
  visible,
  onClose,
  onEdit,
  onPrivacy,
  onDelete,
  isPublic = false,
  isOwner = true,
}) => {
  const { t } = useTranslation();

  const handleEdit = () => {
    onClose();
    onEdit();
  };

  const handlePrivacy = () => {
    onClose();
    onPrivacy();
  };

  const handleDelete = () => {
    onClose();
    onDelete();
  };

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <StyledBlurView
          {...blurConfig.backgroundBlur}
          className="flex-1 justify-end"
        >
          <TouchableWithoutFeedback>
            <StyledView className="items-center pb-6 px-4">
              {/* Actions Container */}
              <StyledBlurView
                {...blurConfig.containerBlur}
                className="w-full overflow-hidden mb-2"
                style={modalStyles.actionModalContainer}
              >
                <StyledView>
                  {/* Edit Button - Only for owner */}
                  {isOwner && (
                    <StyledTouchableOpacity
                      className="py-4 items-center"
                      style={{
                        borderBottomWidth: 0.5,
                        borderBottomColor: "rgba(200, 200, 200, 0.3)",
                        backgroundColor: "transparent",
                      }}
                      onPress={handleEdit}
                    >
                      <StyledText
                        className={modalClasses.buttonText}
                        style={{
                          fontFamily: fontNames.regular,
                          fontSize: 17,
                          includeFontPadding: false,
                        }}
                      >
                        {t("common.edit", "Edit")}
                      </StyledText>
                    </StyledTouchableOpacity>
                  )}

                  {/* Privacy Button - Only for owner */}
                  {isOwner && (
                    <StyledTouchableOpacity
                      className="py-4 items-center"
                      style={{
                        borderBottomWidth: 0.5,
                        borderBottomColor: "rgba(200, 200, 200, 0.3)",
                        backgroundColor: "transparent",
                      }}
                      onPress={handlePrivacy}
                    >
                      <StyledText
                        className={modalClasses.buttonText}
                        style={{
                          fontFamily: fontNames.regular,
                          fontSize: 17,
                          includeFontPadding: false,
                        }}
                      >
                        {isPublic
                          ? t("privacy.makePrivate", "Make Private")
                          : t("privacy.makePublic", "Make Public")}
                      </StyledText>
                    </StyledTouchableOpacity>
                  )}

                  {/* Delete Button - Only for owner */}
                  {isOwner && (
                    <StyledTouchableOpacity
                      className="py-4 items-center"
                      style={{
                        backgroundColor: "transparent",
                      }}
                      onPress={handleDelete}
                    >
                      <StyledText
                        className={modalClasses.deleteButtonTextLight}
                        style={{
                          fontFamily: fontNames.regular,
                          fontSize: 17,
                          includeFontPadding: false,
                        }}
                      >
                        {t("common.delete", "Delete")}
                      </StyledText>
                    </StyledTouchableOpacity>
                  )}

                  {/* Report Button - Only for non-owners */}
                  {!isOwner && (
                    <StyledTouchableOpacity
                      className="py-4 items-center"
                      style={{
                        backgroundColor: "transparent",
                      }}
                      onPress={() => {
                        onClose();
                        // TODO: Implement report functionality
                      }}
                    >
                      <StyledText
                        className={modalClasses.deleteButtonTextLight}
                        style={{
                          fontFamily: fontNames.regular,
                          fontSize: 17,
                          includeFontPadding: false,
                        }}
                      >
                        {t("common.report", "Report")}
                      </StyledText>
                    </StyledTouchableOpacity>
                  )}
                </StyledView>
              </StyledBlurView>

              {/* Cancel Button */}
              <StyledBlurView
                {...blurConfig.containerBlur}
                className="w-full overflow-hidden"
                style={{
                  ...modalStyles.actionModalContainer,
                  borderRadius: 20,
                }}
              >
                <StyledTouchableOpacity
                  className="py-4 items-center"
                  style={{
                    backgroundColor: "transparent",
                  }}
                  onPress={onClose}
                >
                  <StyledText
                    className={modalClasses.cancelButtonText}
                    style={{
                      fontFamily: fontNames.medium,
                      fontSize: 17,
                      includeFontPadding: false,
                    }}
                  >
                    {t("common.cancel", "Cancel")}
                  </StyledText>
                </StyledTouchableOpacity>
              </StyledBlurView>
            </StyledView>
          </TouchableWithoutFeedback>
        </StyledBlurView>
      </TouchableWithoutFeedback>
    </StyledModal>
  );
};

export default TrickActionsModal;
