// components/ui/MediaSourceModal.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { styled } from "nativewind";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { BlurView } from "expo-blur";
import { fontNames } from "../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledBlurView = styled(BlurView);

const { width: screenWidth } = Dimensions.get("window");

interface MediaSourceModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectGallery: () => void;
  onSelectCamera: () => void;
  type: "photo" | "video";
}

const MediaSourceModal: React.FC<MediaSourceModalProps> = ({
  visible,
  onClose,
  onSelectGallery,
  onSelectCamera,
  type,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <StyledBlurView
        intensity={10}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          activeOpacity={1}
          onPress={onClose}
        />

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
                <StyledText
                  className="text-white text-xl text-center mb-6"
                  style={{
                    fontFamily: fontNames.semiBold,
                    fontSize: 24,
                    includeFontPadding: false,
                  }}
                >
                  {type === "photo"
                    ? t("selectPhotoSource", "Seleccionar fuente")
                    : t("selectVideoSource", "Seleccionar fuente")}
                </StyledText>

                {/* Opción de Cámara */}
                <StyledTouchableOpacity
                  onPress={onSelectCamera}
                  className="mb-3"
                  style={{
                    borderBottomWidth: 0.5,
                    borderBottomColor: "rgba(200, 200, 200, 0.3)",
                    paddingBottom: 16,
                  }}
                >
                  <StyledView className="flex-row items-center">
                    <StyledView className="w-12 h-12 bg-emerald-500/20 rounded-full items-center justify-center mr-4">
                      <Feather name="camera" size={24} color="#10b981" />
                    </StyledView>
                    <StyledView className="flex-1">
                      <StyledText
                        className="text-white text-base"
                        style={{
                          fontFamily: fontNames.medium,
                          fontSize: 16,
                          includeFontPadding: false,
                        }}
                      >
                        {type === "photo"
                          ? t("takePhoto", "Tomar foto")
                          : t("recordVideo", "Grabar video")}
                      </StyledText>
                      <StyledText
                        className="text-white/60 text-sm mt-1"
                        style={{
                          fontFamily: fontNames.light,
                          fontSize: 14,
                          includeFontPadding: false,
                        }}
                      >
                        {type === "photo"
                          ? t("useCamera", "Usar la cámara")
                          : t("recordNewVideo", "Grabar un nuevo video")}
                      </StyledText>
                    </StyledView>
                  </StyledView>
                </StyledTouchableOpacity>

                {/* Opción de Galería */}
                <StyledTouchableOpacity
                  onPress={onSelectGallery}
                  className="mb-3"
                  style={{
                    borderBottomWidth: 0.5,
                    borderBottomColor: "rgba(200, 200, 200, 0.3)",
                    paddingBottom: 16,
                  }}
                >
                  <StyledView className="flex-row items-center">
                    <StyledView className="w-12 h-12 bg-emerald-500/20 rounded-full items-center justify-center mr-4">
                      <MaterialIcons
                        name="photo-library"
                        size={24}
                        color="#10b981"
                      />
                    </StyledView>
                    <StyledView className="flex-1">
                      <StyledText
                        className="text-white text-base"
                        style={{
                          fontFamily: fontNames.medium,
                          fontSize: 16,
                          includeFontPadding: false,
                        }}
                      >
                        {t("gallery", "Galería")}
                      </StyledText>
                      <StyledText
                        className="text-white/60 text-sm mt-1"
                        style={{
                          fontFamily: fontNames.light,
                          fontSize: 14,
                          includeFontPadding: false,
                        }}
                      >
                        {type === "photo"
                          ? t("selectFromGallery", "Seleccionar de tu galería")
                          : t(
                              "selectVideoFromGallery",
                              "Seleccionar video existente"
                            )}
                      </StyledText>
                    </StyledView>
                  </StyledView>
                </StyledTouchableOpacity>

                {/* Botón de Cancelar */}
                <StyledTouchableOpacity
                  onPress={onClose}
                  className="py-3 items-center"
                >
                  <StyledText
                    className="text-white/50 text-base"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 16,
                      includeFontPadding: false,
                    }}
                  >
                    {t("cancel", "Cancelar")}
                  </StyledText>
                </StyledTouchableOpacity>
              </StyledView>
            </StyledBlurView>
          </StyledView>
        </StyledView>
      </StyledBlurView>
    </Modal>
  );
};

export default MediaSourceModal;
