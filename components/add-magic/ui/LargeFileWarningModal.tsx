// components/add-magic/ui/LargeFileWarningModal.tsx
import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { fontNames } from "../../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledBlurView = styled(BlurView);

const { width: screenWidth } = Dimensions.get("window");

interface LargeFileWarningModalProps {
  visible: boolean;
  fileSize: number;
  estimatedTime: number;
  onCancel: () => void;
  onProceed: () => void;
}

const formatSize = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(0)} MB`;
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)} segundos`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) {
    return `${mins} min ${secs > 0 ? `${secs} seg` : ""}`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins > 0 ? `${remainingMins}min` : ""}`;
};

const LargeFileWarningModal: React.FC<LargeFileWarningModalProps> = ({
  visible,
  fileSize,
  estimatedTime,
  onCancel,
  onProceed,
}) => {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <StyledBlurView
        intensity={10}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <StyledView style={{ width: screenWidth * 0.9, maxWidth: 400 }}>
          <StyledView
            style={{
              borderRadius: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <StyledBlurView
              intensity={40}
              tint="dark"
              experimentalBlurMethod="dimezisBlurView"
              style={{
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: "rgba(255, 255, 255, 0.30)",
                borderWidth: 1,
                borderColor: "rgba(200, 200, 200, 0.4)",
              }}
            >
              <StyledView className="p-6">
                {/* Warning Icon */}
                <StyledView className="items-center mb-6">
                  <StyledView className="w-16 h-16 bg-amber-500/20 rounded-full items-center justify-center mb-4">
                    <MaterialIcons name="warning" size={32} color="#f59e0b" />
                  </StyledView>

                  <StyledText
                    className="text-white text-xl text-center mb-2"
                    style={{
                      fontFamily: fontNames.semiBold,
                      fontSize: 20,
                      includeFontPadding: false,
                    }}
                  >
                    {t("largeVideoWarning", "Video Grande Detectado")}
                  </StyledText>

                  <StyledText
                    className="text-white/60 text-sm text-center"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 14,
                      includeFontPadding: false,
                    }}
                  >
                    {t("largeVideoInfo", "Este archivo tardará un tiempo en subir")}
                  </StyledText>
                </StyledView>

                {/* File Info */}
                <StyledView className="mb-6 space-y-3">
                  {/* File Size */}
                  <StyledView className="flex-row justify-between items-center">
                    <StyledText
                      className="text-white/70 text-sm"
                      style={{
                        fontFamily: fontNames.regular,
                        fontSize: 14,
                        includeFontPadding: false,
                      }}
                    >
                      {t("fileSize", "Tamaño del archivo")}:
                    </StyledText>
                    <StyledText
                      className="text-white text-base"
                      style={{
                        fontFamily: fontNames.semiBold,
                        fontSize: 16,
                        includeFontPadding: false,
                      }}
                    >
                      {formatSize(fileSize)}
                    </StyledText>
                  </StyledView>

                  {/* Estimated Time */}
                  <StyledView className="flex-row justify-between items-center">
                    <StyledText
                      className="text-white/70 text-sm"
                      style={{
                        fontFamily: fontNames.regular,
                        fontSize: 14,
                        includeFontPadding: false,
                      }}
                    >
                      {t("estimatedUploadTime", "Tiempo estimado")}:
                    </StyledText>
                    <StyledText
                      className="text-amber-400 text-base"
                      style={{
                        fontFamily: fontNames.semiBold,
                        fontSize: 16,
                        includeFontPadding: false,
                      }}
                    >
                      ~{formatTime(estimatedTime)}
                    </StyledText>
                  </StyledView>
                </StyledView>

                {/* Warning Message */}
                <StyledView
                  className="rounded-lg p-3 mb-6"
                  style={{
                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                    borderWidth: 1,
                    borderColor: "rgba(245, 158, 11, 0.3)",
                  }}
                >
                  <StyledText
                    className="text-amber-300 text-xs text-center"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 12,
                      includeFontPadding: false,
                    }}
                  >
                    {t("largeVideoTip", "Mantén la app abierta durante la subida. Puedes minimizarla pero no cerrarla.")}
                  </StyledText>
                </StyledView>

                {/* Action Buttons */}
                <StyledView className="flex-row space-x-3">
                  <StyledTouchableOpacity
                    onPress={onCancel}
                    className="flex-1 py-3 rounded-lg"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <StyledText
                      className="text-white text-center"
                      style={{
                        fontFamily: fontNames.medium,
                        fontSize: 16,
                        includeFontPadding: false,
                      }}
                    >
                      {t("cancel", "Cancelar")}
                    </StyledText>
                  </StyledTouchableOpacity>

                  <StyledTouchableOpacity
                    onPress={onProceed}
                    className="flex-1 py-3 rounded-lg"
                    style={{
                      backgroundColor: "#10b981",
                    }}
                  >
                    <StyledText
                      className="text-white text-center"
                      style={{
                        fontFamily: fontNames.semiBold,
                        fontSize: 16,
                        includeFontPadding: false,
                      }}
                    >
                      {t("continueUpload", "Continuar")}
                    </StyledText>
                  </StyledTouchableOpacity>
                </StyledView>
              </StyledView>
            </StyledBlurView>
          </StyledView>
        </StyledView>
      </StyledBlurView>
    </Modal>
  );
};

export default LargeFileWarningModal;
