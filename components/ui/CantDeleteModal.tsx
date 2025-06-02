import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { modalStyles, blurConfig, modalClasses } from "../../styles/modalStyles";

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

const CantDeleteModal: React.FC<CategoryNotEmptyModalProps> = ({
  visible,
  onClose,
  categoryName,
  itemCount,
}) => {
  const { t } = useTranslation();

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      {/* Fondo desenfocado general */}
      <StyledBlurView
        {...blurConfig.backgroundBlur}
        className={modalClasses.backgroundBlur}
      >
        <StyledView className={modalClasses.mainContainer}>
          {/* Caja principal con desenfoque e intento de vidrio esmerilado */}
          <StyledBlurView
            {...blurConfig.containerBlur}
            className={modalClasses.containerBlur}
            style={modalStyles.modalContainer}
          >
            {/* Contenido: título y mensaje */}
            <StyledView style={modalStyles.contentContainer}>
              <StyledText className={modalClasses.titleTextWithOpacity}>
                {t("categoryNotEmpty.title", "Can't delete category")}
              </StyledText>

              <StyledText className={`${modalClasses.subtitleText} mt-3`}>
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

            {/* Footer con un único botón */}
            <StyledView style={modalStyles.footerContainerCompact} className={modalClasses.flexRow}>
              <StyledTouchableOpacity
                className={modalClasses.centerContent}
                style={modalStyles.buttonFull}
                onPress={handleClose}
              >
                <StyledText className="text-white/80 text-base font-medium">
                  {t("common.ok", "OK")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledBlurView>
        </StyledView>
      </StyledBlurView>
    </StyledModal>
  );
};

export default React.memo(CantDeleteModal);