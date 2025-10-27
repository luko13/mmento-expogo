// components/add-magic/ui/UploadProgressModal.tsx
import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Dimensions,
  Animated,
} from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { fontNames } from "../../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledBlurView = styled(BlurView);

const { width: screenWidth } = Dimensions.get("window");

interface UploadProgressModalProps {
  visible: boolean;
  progress: number;
  currentFile: string;
  elapsedTime: number;
  totalFiles: number;
  processedFiles: number;
  uploadSpeed?: number; // MB/s
  bytesUploaded?: number;
  bytesTotal?: number;
  estimatedTimeRemaining?: number; // seconds
}

const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  visible,
  progress,
  currentFile,
  elapsedTime,
  totalFiles,
  processedFiles,
  uploadSpeed = 0,
  bytesUploaded = 0,
  bytesTotal = 0,
  estimatedTimeRemaining = 0,
}) => {
  const { t } = useTranslation();
  const progressAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const progressWidth = progressAnimation.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <StyledBlurView
        intensity={10}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <StyledView style={{ width: screenWidth * 0.9, maxWidth: 400 }}>
          {/* Wrapper con sombras */}
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
            {/* Blur container recortado */}
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
              {/* Content */}
              <StyledView className="p-6">
                {/* Header con icono */}
                <StyledView className="items-center mb-6">
                  <StyledView className="w-16 h-16 bg-emerald-500/20 rounded-full items-center justify-center mb-4">
                    <MaterialIcons name="cloud-upload" size={32} color="#10b981" />
                  </StyledView>
                  
                  <StyledText
                    className="text-white text-xl text-center mb-2"
                    style={{
                      fontFamily: fontNames.semiBold,
                      fontSize: 20,
                      includeFontPadding: false,
                    }}
                  >
                    {t("uploadingFiles", "Subiendo archivos")}
                  </StyledText>
                  
                  <StyledText
                    className="text-white/60 text-sm text-center"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 14,
                      includeFontPadding: false,
                    }}
                  >
                    {t("uploadingToCloud", "Subiendo tus archivos a la nube")}
                  </StyledText>
                </StyledView>

                {/* Progress Info */}
                <StyledView className="mb-4">
                  <StyledView className="flex-row justify-between mb-2">
                    <StyledText
                      className="text-white/80 text-sm"
                      style={{
                        fontFamily: fontNames.regular,
                        fontSize: 14,
                        includeFontPadding: false,
                      }}
                    >
                      {t("file", "Archivo")} {processedFiles}/{totalFiles}
                    </StyledText>
                    <StyledText
                      className="text-emerald-400 text-sm font-medium"
                      style={{
                        fontFamily: fontNames.medium,
                        fontSize: 14,
                        includeFontPadding: false,
                      }}
                    >
                      {progress.toFixed(0)}%
                    </StyledText>
                  </StyledView>

                  {/* Progress Bar Container */}
                  <StyledView 
                    className="h-2 rounded-full overflow-hidden mb-3"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <Animated.View
                      style={{
                        height: "100%",
                        width: progressWidth,
                        backgroundColor: "#10b981",
                        borderRadius: 4,
                      }}
                    />
                  </StyledView>

                  {/* Current File */}
                  <StyledView 
                    className="rounded-lg px-3 py-2 mb-3"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    <StyledText
                      className="text-white/50 text-xs mb-1"
                      style={{
                        fontFamily: fontNames.regular,
                        fontSize: 12,
                        includeFontPadding: false,
                      }}
                    >
                      {t("processing", "Procesando")}:
                    </StyledText>
                    <StyledText
                      className="text-white/80 text-sm"
                      numberOfLines={1}
                      style={{
                        fontFamily: fontNames.light,
                        fontSize: 14,
                        includeFontPadding: false,
                      }}
                    >
                      {currentFile || t("preparingFiles", "Preparando archivos...")}
                    </StyledText>
                  </StyledView>

                  {/* Timer */}
                  <StyledView className="flex-row items-center justify-center mb-2">
                    <Feather name="clock" size={16} color="rgba(255,255,255,0.6)" />
                    <StyledText
                      className="text-white/60 text-sm ml-2"
                      style={{
                        fontFamily: fontNames.regular,
                        fontSize: 14,
                        includeFontPadding: false,
                      }}
                    >
                      {t("elapsedTime", "Tiempo transcurrido")}: {formatTime(elapsedTime)}
                    </StyledText>
                  </StyledView>

                  {/* Upload Speed and Bytes */}
                  {bytesTotal > 0 && (
                    <>
                      <StyledView className="flex-row items-center justify-center mb-2">
                        <MaterialIcons name="speed" size={16} color="rgba(16, 185, 129, 0.8)" />
                        <StyledText
                          className="text-emerald-400/80 text-sm ml-2"
                          style={{
                            fontFamily: fontNames.regular,
                            fontSize: 14,
                            includeFontPadding: false,
                          }}
                        >
                          {uploadSpeed > 0 ? `${uploadSpeed.toFixed(2)} MB/s` : t("calculating", "Calculando...")}
                        </StyledText>
                      </StyledView>

                      <StyledView className="flex-row items-center justify-center">
                        <MaterialIcons name="cloud-upload" size={16} color="rgba(255,255,255,0.6)" />
                        <StyledText
                          className="text-white/60 text-sm ml-2"
                          style={{
                            fontFamily: fontNames.regular,
                            fontSize: 14,
                            includeFontPadding: false,
                          }}
                        >
                          {formatBytes(bytesUploaded)} / {formatBytes(bytesTotal)}
                        </StyledText>
                      </StyledView>
                    </>
                  )}
                </StyledView>

                {/* Estimated Time */}
                {progress > 10 && estimatedTimeRemaining > 0 && (
                  <StyledView
                    className="pt-4"
                    style={{
                      borderTopWidth: 0.5,
                      borderTopColor: "rgba(200, 200, 200, 0.3)",
                    }}
                  >
                    <StyledText
                      className="text-white/40 text-xs text-center"
                      style={{
                        fontFamily: fontNames.light,
                        fontSize: 12,
                        includeFontPadding: false,
                      }}
                    >
                      {t("estimatedRemaining", "Tiempo estimado restante")}:{" "}
                      {formatTime(estimatedTimeRemaining)}
                    </StyledText>
                  </StyledView>
                )}

                {/* Cloud Optimization Note */}
                <StyledView className="flex-row items-center justify-center mt-4">
                  <MaterialIcons
                    name="cloud-done"
                    size={12}
                    color="rgba(16, 185, 129, 0.6)"
                  />
                  <StyledText
                    className="text-emerald-500/60 text-xs ml-1"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 12,
                      includeFontPadding: false,
                    }}
                  >
                    {t("cloudflareOptimization", "Optimización automática en la nube")}
                  </StyledText>
                </StyledView>
              </StyledView>
            </StyledBlurView>
          </StyledView>
        </StyledView>
      </StyledBlurView>
    </Modal>
  );
};

export default UploadProgressModal;