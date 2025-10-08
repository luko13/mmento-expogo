import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { modalStyles, blurConfig, modalClasses } from "../../styles/modalStyles";
import { fontNames } from "../../app/_layout";

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
        experimentalBlurMethod="dimezisBlurView"
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={handleClose}
        >
          <StyledView className={modalClasses.mainContainer}>
            <Pressable onPress={(e) => e.stopPropagation()}>
          {/* Caja principal con desenfoque e intento de vidrio esmerilado */}
          <StyledBlurView
            {...blurConfig.containerBlur}
            experimentalBlurMethod="dimezisBlurView"
            className={modalClasses.containerBlur}
            style={modalStyles.modalContainer}
          >
            {/* Contenido: título y mensaje */}
            <StyledView style={modalStyles.contentContainer}>
              <StyledText 
                className={modalClasses.titleTextWithOpacity}
                style={{
                  fontFamily: fontNames.semiBold,
                  fontSize: 18,
                  includeFontPadding: false,
                }}
              >
                {t("categoryNotEmpty.title", "Can't delete category")}
              </StyledText>

              <StyledText 
                className={`${modalClasses.subtitleText} mt-3`}
                style={{
                  fontFamily: fontNames.regular,
                  fontSize: 16,
                  includeFontPadding: false,
                }}
              >
                {t(
                  "categoryNotEmpty.message",
                  "You need to move or delete all items in this category first."
                )}
              </StyledText>

              {itemCount !== undefined && itemCount > 0 && (
                <StyledText 
                  className="text-white/40 text-sm text-center mt-2"
                  style={{
                    fontFamily: fontNames.light,
                    fontSize: 14,
                    includeFontPadding: false,
                  }}
                >
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
                <StyledText 
                  className="text-white/80 text-base font-medium"
                  style={{
                    fontFamily: fontNames.medium,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                >
                  {t("common.ok", "OK")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledBlurView>
            </Pressable>
          </StyledView>
        </Pressable>
      </StyledBlurView>
    </StyledModal>
  );
};

export default React.memo(CantDeleteModal);