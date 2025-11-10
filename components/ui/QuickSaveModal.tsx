import React from "react";
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

interface QuickSaveModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const QuickSaveModal: React.FC<QuickSaveModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      <StyledBlurView
        {...blurConfig.backgroundBlur}
        className={modalClasses.backgroundBlur}
        experimentalBlurMethod="dimezisBlurView"
      >
        <Pressable style={{ flex: 1 }} onPress={onClose}>
          <StyledView className={modalClasses.mainContainer}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              {/* Wrapper con sombras */}
              <View style={modalStyles.modalCardShadow}>
                {/* BlurView con efecto glass */}
                <StyledBlurView
                  {...blurConfig.containerBlur}
                  experimentalBlurMethod="dimezisBlurView"
                  className={modalClasses.containerBlur}
                  style={modalStyles.modalCardBlur}
                >
                  {/* Contenido */}
                  <StyledView style={modalStyles.contentContainer}>
                    <StyledText
                      className={modalClasses.titleTextCentered}
                      style={{
                        fontFamily: fontNames.semiBold,
                        fontSize: 20,
                        includeFontPadding: false,
                        marginBottom: 12,
                      }}
                    >
                      {t("quickSave.title", "¿Guardar ahora?")}
                    </StyledText>
                    <StyledText
                      className={modalClasses.subtitleText}
                      style={{
                        fontFamily: fontNames.regular,
                        fontSize: 15,
                        includeFontPadding: false,
                      }}
                    >
                      {t(
                        "quickSave.message",
                        "El truco se guardará con los datos actuales. Los campos vacíos podrás completarlos más tarde."
                      )}
                    </StyledText>
                  </StyledView>

                  {/* Footer con botones */}
                  <StyledView
                    style={modalStyles.footerContainer}
                    className={modalClasses.flexRow}
                  >
                    <StyledTouchableOpacity
                      className={modalClasses.centerContent}
                      style={{
                        borderRightWidth: 0.5,
                        borderColor: "rgba(200,200,200,0.4)",
                      }}
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
                        {t("common.cancel", "Cancelar")}
                      </StyledText>
                    </StyledTouchableOpacity>

                    <StyledTouchableOpacity
                      className={modalClasses.centerContent}
                      onPress={onConfirm}
                    >
                      <StyledText
                        className={modalClasses.buttonText}
                        style={{
                          fontFamily: fontNames.medium,
                          fontSize: 16,
                          includeFontPadding: false,
                        }}
                      >
                        {t("common.save", "Guardar")}
                      </StyledText>
                    </StyledTouchableOpacity>
                  </StyledView>
                </StyledBlurView>
              </View>
            </Pressable>
          </StyledView>
        </Pressable>
      </StyledBlurView>
    </StyledModal>
  );
};

export default React.memo(QuickSaveModal);
