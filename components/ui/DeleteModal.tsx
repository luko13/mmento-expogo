import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, ActivityIndicator } from "react-native";
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
  onConfirm: () => void | Promise<void>;
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
  const [isDeleting, setIsDeleting] = useState(false);

  // Resetear estado cuando el modal se cierra
  React.useEffect(() => {
    if (!visible) {
      setIsDeleting(false);
    }
  }, [visible]);

  // Log cuando isDeleting cambia
  React.useEffect(() => {
    console.log("[DeleteModal] isDeleting state changed to:", isDeleting);
  }, [isDeleting]);

  // Log cuando visible cambia
  React.useEffect(() => {
    console.log("[DeleteModal] visible prop changed to:", visible);
  }, [visible]);

  const getDeleteMessage = () => {
    if (customMessage) return customMessage;

    if (itemName && itemType) {
      return `${t("common.delete", "Delete")} `;
    }

    return t("common.confirmDelete", "This action can't be undone.");
  };

  const handleConfirm = () => {
    console.log("[DeleteModal] Confirm button pressed");
    console.log("[DeleteModal] Current isDeleting state:", isDeleting);
    setIsDeleting(true);
    console.log("[DeleteModal] Called setIsDeleting(true)");

    // Dar tiempo a React para re-renderizar con isDeleting=true
    setTimeout(async () => {
      console.log("[DeleteModal] Timeout executed, starting onConfirm...");
      console.log("[DeleteModal] isDeleting state in timeout:", isDeleting);
      try {
        await onConfirm();
        console.log("[DeleteModal] onConfirm completed successfully");
      } catch (error) {
        console.error("[DeleteModal] Error in onConfirm:", error);
        setIsDeleting(false);
      }
    }, 100); // 100ms para que React renderice el spinner
  };

  console.log("[DeleteModal] Rendering with isDeleting:", isDeleting, "visible:", visible);

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      <StyledBlurView
        {...blurConfig.backgroundBlur}
        experimentalBlurMethod="dimezisBlurView"
        className={modalClasses.backgroundBlur}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={isDeleting ? undefined : onClose}
        >
          <StyledView className={modalClasses.mainContainer}>
            <Pressable onPress={(e) => e.stopPropagation()}>
          <StyledBlurView
            {...blurConfig.containerBlur}
            experimentalBlurMethod="dimezisBlurView"
            className={modalClasses.containerBlur}
            style={modalStyles.modalContainer}
          >
            {/* Content */}
            <StyledView className="px-6 py-5">
              {isDeleting ? (
                <StyledView className="items-center py-4">
                  <ActivityIndicator size="large" color="#FF6B6B" />
                  <StyledText
                    className="text-white/90 mt-4"
                    style={{
                      fontFamily: fontNames.medium,
                      fontSize: 16,
                      includeFontPadding: false,
                    }}
                  >
                    {t("common.deleting", "Deleting...")}
                  </StyledText>
                  <StyledText
                    className="text-white/60 mt-2"
                    style={{
                      fontFamily: fontNames.regular,
                      fontSize: 14,
                      includeFontPadding: false,
                    }}
                  >
                    {t("common.pleaseWait", "Please wait")}
                  </StyledText>
                </StyledView>
              ) : (
                <>
                  <StyledText
                    className={modalClasses.titleTextWithOpacity}
                    style={{
                      fontFamily: fontNames.medium,
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
                            fontFamily: fontNames.semiBold,
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
                </>
              )}
            </StyledView>

            {/* Actions - Solo mostrar si NO está eliminando */}
            {!isDeleting && (
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
                  onPress={handleConfirm}
                >
                  <StyledText
                    className={modalClasses.deleteButtonTextLight}
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
            )}
          </StyledBlurView>
            </Pressable>
          </StyledView>
        </Pressable>
      </StyledBlurView>
    </StyledModal>
  );
};

export default DeleteModal;
