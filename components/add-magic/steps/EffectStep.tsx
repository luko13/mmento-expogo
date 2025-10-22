// components/add-magic/steps/EffectStep.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import {
  Feather,
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import type { MagicTrick } from "../../../types/magicTrick";
import { LinearGradient } from "expo-linear-gradient";
import CustomTooltip from "../../ui/Tooltip";
import { MediaSelector, MediaSelectorRef } from "../../ui/MediaSelector";
import { FullScreenTextModal } from "../../ui/FullScreenTextModal";
import { fontNames } from "../../../app/_layout";
import { cloudflareStreamService } from "../../../services/cloudflare/CloudflareStreamService";
import { cloudflareImagesService } from "../../../services/cloudflare/CloudflareImagesService";
import { supabase } from "../../../lib/supabase";
import { Alert } from "react-native";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

interface StepProps {
  trickData: MagicTrick;
  updateTrickData: (data: Partial<MagicTrick>) => void;
  onNext?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  currentStep?: number;
  totalSteps?: number;
  isSubmitting?: boolean;
  isNextButtonDisabled?: boolean;
  isLastStep?: boolean;
  isEditMode?: boolean;
}

export default function EffectStep({
  trickData,
  updateTrickData,
  onNext,
  onCancel,
  onSave,
  currentStep = 2,
  totalSteps = 3,
  isSubmitting = false,
  isEditMode = false,
}: StepProps) {
  const { t } = useTranslation();

  // Referencias a los selectores de media
  const effectVideoRef = useRef<MediaSelectorRef>(null);
  const secretVideoRef = useRef<MediaSelectorRef>(null);
  const photosRef = useRef<MediaSelectorRef>(null);

  // Estados para los modales de pantalla completa
  const [showEffectModal, setShowEffectModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);

  // Function to dismiss keyboard
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Navigate to extras step
  const goToExtrasStep = () => {
    if (onNext) {
      onNext();
    }
  };

  // Helper: Copiar archivo inmediatamente para evitar que ImagePicker lo borre
  const copyFileImmediately = async (uri: string): Promise<string> => {
    try {
      // Crear directorio permanente
      const permanentDir = `${FileSystem.documentDirectory}permanent_uploads/`;
      const dirInfo = await FileSystem.getInfoAsync(permanentDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(permanentDir, { intermediates: true });
      }

      // Generar nombre único
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const extension = uri.split('.').pop() || 'tmp';
      const newFilename = `${timestamp}_${random}.${extension}`;
      const permanentUri = `${permanentDir}${newFilename}`;

      // Copiar archivo
      await FileSystem.copyAsync({
        from: uri,
        to: permanentUri
      });

      console.log(`✅ Archivo copiado permanentemente: ${permanentUri}`);
      return permanentUri;
    } catch (error) {
      console.error('❌ Error copiando archivo:', error);
      // Si falla la copia, devolver URI original como fallback
      return uri;
    }
  };

  // Preparar archivos iniciales para los MediaSelectors
  const getInitialEffectVideo = () => {
    // Priorizar archivo local recién seleccionado
    if (trickData.localFiles?.effectVideo) {
      return [
        {
          uri: trickData.localFiles.effectVideo,
          fileName: `effect_video_${Date.now()}.mp4`,
        },
      ];
    }
    // Si estamos en modo edición y hay URL existente, mostrarla
    if (isEditMode && trickData.effect_video_url) {
      // Extraer nombre del archivo de la URL de Cloudflare
      const fileName = trickData.effect_video_url.includes('cloudflarestream.com')
        ? 'effect_video.mp4'
        : trickData.effect_video_url.split('/').pop() || 'effect_video.mp4';
      return [
        {
          uri: trickData.effect_video_url,
          fileName: fileName,
          isExisting: true, // Flag para indicar que es un archivo existente
        },
      ];
    }
    return [];
  };

  const getInitialSecretVideo = () => {
    // Priorizar archivo local recién seleccionado
    if (trickData.localFiles?.secretVideo) {
      return [
        {
          uri: trickData.localFiles.secretVideo,
          fileName: `secret_video_${Date.now()}.mp4`,
        },
      ];
    }
    // Si estamos en modo edición y hay URL existente, mostrarla
    if (isEditMode && trickData.secret_video_url) {
      const fileName = trickData.secret_video_url.includes('cloudflarestream.com')
        ? 'secret_video.mp4'
        : trickData.secret_video_url.split('/').pop() || 'secret_video.mp4';
      return [
        {
          uri: trickData.secret_video_url,
          fileName: fileName,
          isExisting: true,
        },
      ];
    }
    return [];
  };

  const getInitialPhotos = () => {
    // Priorizar archivos locales recién seleccionados
    if (
      trickData.localFiles?.photos &&
      trickData.localFiles.photos.length > 0
    ) {
      return trickData.localFiles.photos.map((uri, index) => ({
        uri,
        fileName: `photo_${index}.jpg`,
      }));
    }
    // Si estamos en modo edición y hay fotos existentes, mostrarlas
    if (isEditMode) {
      const photos: Array<{ uri: string; fileName: string; isExisting?: boolean }> = [];

      // Agregar photo_url principal si existe
      if (trickData.photo_url) {
        const fileName = trickData.photo_url.includes('imagedelivery.net')
          ? 'photo_main.jpg'
          : trickData.photo_url.split('/').pop() || 'photo_main.jpg';
        photos.push({
          uri: trickData.photo_url,
          fileName: fileName,
          isExisting: true,
        });
      }

      // Agregar fotos adicionales si existen
      if (trickData.photos && trickData.photos.length > 0) {
        trickData.photos.forEach((photoUrl, index) => {
          const fileName = photoUrl.includes('imagedelivery.net')
            ? `photo_${index + 1}.jpg`
            : photoUrl.split('/').pop() || `photo_${index + 1}.jpg`;
          photos.push({
            uri: photoUrl,
            fileName: fileName,
            isExisting: true,
          });
        });
      }

      return photos;
    }
    return [];
  };

  // Handlers para eliminar archivos existentes de Cloudflare
  const handleRemoveEffectVideo = async (file: { uri: string; fileName: string; isExisting?: boolean }) => {
    if (!file.isExisting) return;

    try {
      // Extraer el video ID de la URL de Cloudflare Stream
      const videoId = file.uri.split('/').find((part, index, arr) => {
        return part.length === 32 && /^[a-f0-9]+$/.test(part);
      });

      if (videoId) {
        // Eliminar de Cloudflare Stream
        await cloudflareStreamService.deleteVideo(videoId);
      }

      // Eliminar URL de trickData
      updateTrickData({ effect_video_url: null });

      Alert.alert(
        t("success", "Success"),
        t("videoDeletedSuccessfully", "Video eliminado correctamente")
      );
    } catch (error) {
      console.error("Error eliminando video del efecto:", error);
      Alert.alert(
        t("error", "Error"),
        t("errorDeletingVideo", "Error al eliminar el video")
      );
    }
  };

  const handleRemoveSecretVideo = async (file: { uri: string; fileName: string; isExisting?: boolean }) => {
    if (!file.isExisting) return;

    try {
      // Extraer el video ID de la URL de Cloudflare Stream
      const videoId = file.uri.split('/').find((part, index, arr) => {
        return part.length === 32 && /^[a-f0-9]+$/.test(part);
      });

      if (videoId) {
        // Eliminar de Cloudflare Stream
        await cloudflareStreamService.deleteVideo(videoId);
      }

      // Eliminar URL de trickData
      updateTrickData({ secret_video_url: null });

      Alert.alert(
        t("success", "Success"),
        t("videoDeletedSuccessfully", "Video eliminado correctamente")
      );
    } catch (error) {
      console.error("Error eliminando video del secreto:", error);
      Alert.alert(
        t("error", "Error"),
        t("errorDeletingVideo", "Error al eliminar el video")
      );
    }
  };

  const handleRemovePhoto = async (file: { uri: string; fileName: string; isExisting?: boolean }) => {
    if (!file.isExisting) return;

    try {
      // Extraer el image ID de la URL de Cloudflare Images
      const imageId = file.uri.split('/').pop()?.split('?')[0];

      if (imageId) {
        // Eliminar de Cloudflare Images
        await cloudflareImagesService.deleteImage(imageId);
      }

      // Actualizar trickData eliminando esta foto
      const updatedPhotos = (trickData.photos || []).filter(photoUrl => photoUrl !== file.uri);

      // Si es la foto principal, también limpiarla
      if (trickData.photo_url === file.uri) {
        updateTrickData({
          photo_url: updatedPhotos.length > 0 ? updatedPhotos[0] : null,
          photos: updatedPhotos,
        });
      } else {
        updateTrickData({ photos: updatedPhotos });
      }

      Alert.alert(
        t("success", "Success"),
        t("photoDeletedSuccessfully", "Foto eliminada correctamente")
      );
    } catch (error) {
      console.error("Error eliminando foto:", error);
      Alert.alert(
        t("error", "Error"),
        t("errorDeletingPhoto", "Error al eliminar la foto")
      );
    }
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <StyledView className="flex-1">
        <LinearGradient
          colors={["#15322C", "#15322C"]}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }}
        />

        {/* Header */}
        <StyledView className="px-3 pt-4 pb-4">
          <StyledView className="flex-row items-center justify-between">
            <StyledTouchableOpacity onPress={onCancel} className="p-2">
              <Feather name="chevron-left" size={24} color="white" />
            </StyledTouchableOpacity>

            <StyledText
              className="text-white text-lg font-semibold"
              style={{
                fontFamily: fontNames.light,
                fontSize: 20,
                includeFontPadding: false,
              }}
            >
              {trickData.title || t("trickTitle", "[Title Magic]")}
            </StyledText>

            <StyledTouchableOpacity
              className={`p-2 ${isSubmitting ? "opacity-30" : ""}`}
              onPress={() => {
                if (onSave && !isSubmitting) {
                  onSave();
                }
              }}
              disabled={isSubmitting}
            >
              <StyledText
                className="text-white font-semibold"
                style={{
                  fontFamily: fontNames.light,
                  fontSize: 16,
                  includeFontPadding: false,
                }}
              >
                {isSubmitting ? t("saving", "Saving...") : t("save", "Save")}
              </StyledText>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>

        <StyledScrollView
          className="flex-1 px-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* Effect Section */}
          <StyledView className="mt-2">
            <StyledText
              className="text-white text-lg mb-2"
              style={{
                fontFamily: fontNames.light,
                fontSize: 20,
                includeFontPadding: false,
              }}
            >
              {t("effect", "Efecto")}
            </StyledText>

            {/* Effect Video - Solo selección local, la compresión se hace al guardar */}
            <MediaSelector
              ref={effectVideoRef}
              type="video"
              multiple={false}
              maxFiles={1}
              maxFileSize={50}
              quality={0.5}
              tooltip={t("tooltips.effectVideo")}
              placeholder={t("uploadEffectVideo", "Subir video del efecto*")}
              initialFiles={getInitialEffectVideo()}
              onFileRemoved={handleRemoveEffectVideo}
              onFilesSelected={async (files) => {
                if (files[0]?.uri) {
                  // Copiar archivo INMEDIATAMENTE antes de que ImagePicker lo borre
                  const permanentUri = await copyFileImmediately(files[0].uri);
                  updateTrickData({
                    localFiles: {
                      effectVideo: permanentUri,
                      secretVideo: trickData.localFiles?.secretVideo || null,
                      photos: trickData.localFiles?.photos || [],
                    },
                  });
                } else {
                  updateTrickData({
                    localFiles: {
                      effectVideo: null,
                      secretVideo: trickData.localFiles?.secretVideo || null,
                      photos: trickData.localFiles?.photos || [],
                    },
                  });
                }
              }}
              disableEncryption={true}
            />

            {/* Effect Description */}
            <StyledView className="mb-4 mt-4">
              <StyledView className="flex-row items-start">
                <CustomTooltip
                  text={t("tooltips.effectDescription")}
                  backgroundColor="rgba(91, 185, 163, 0.95)"
                  textColor="white"
                >
                  <StyledView className="w-12 h-20 bg-[#D4D4D4]/10 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                    <MaterialCommunityIcons
                      name="creation"
                      size={24}
                      color="white"
                    />
                  </StyledView>
                </CustomTooltip>
                <StyledView className="flex-1 relative" style={{ height: 80 }}>
                  <StyledTextInput
                    className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#eafffb]/40"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 16,
                      includeFontPadding: false,
                      paddingRight: 40,
                      height: 80,
                      maxHeight: 80,
                    }}
                    placeholder={t(
                      "effectShortDescription",
                      "Descripción corta del efecto"
                    )}
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={trickData.effect}
                    onChangeText={(text) => updateTrickData({ effect: text })}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    scrollEnabled={true}
                  />
                  {/* Expand button */}
                  <StyledTouchableOpacity
                    onPress={() => setShowEffectModal(true)}
                    className="absolute bottom-2 right-2 w-8 h-8 rounded items-center justify-center"
                    style={{ zIndex: 10 }}
                  >
                    <Feather name="maximize-2" size={16} color="rgba(255, 255, 255, 0.7)" />
                  </StyledTouchableOpacity>
                </StyledView>
              </StyledView>
            </StyledView>
          </StyledView>

          {/* Secret Section */}
          <StyledView className="mb-2">
            <StyledText
              className="text-white text-lg mb-2"
              style={{
                fontFamily: fontNames.light,
                fontSize: 20,
                includeFontPadding: false,
              }}
            >
              {t("secret", "Secreto")}
            </StyledText>

            {/* Secret Video */}
            <MediaSelector
              ref={secretVideoRef}
              type="video"
              multiple={false}
              maxFiles={1}
              maxFileSize={50}
              quality={0.5}
              tooltip={t("tooltips.secretVideo")}
              placeholder={t("secretVideoUpload", "Subir video del secreto")}
              initialFiles={getInitialSecretVideo()}
              onFileRemoved={handleRemoveSecretVideo}
              onFilesSelected={async (files) => {
                if (files[0]?.uri) {
                  const permanentUri = await copyFileImmediately(files[0].uri);
                  updateTrickData({
                    localFiles: {
                      effectVideo: trickData.localFiles?.effectVideo || null,
                      secretVideo: permanentUri,
                      photos: trickData.localFiles?.photos || [],
                    },
                  });
                } else {
                  updateTrickData({
                    localFiles: {
                      effectVideo: trickData.localFiles?.effectVideo || null,
                      secretVideo: null,
                      photos: trickData.localFiles?.photos || [],
                    },
                  });
                }
              }}
              disableEncryption={true}
            />

            {/* Secret Description */}
            <StyledView className="mb-4 mt-4">
              <StyledView className="flex-row items-start">
                <CustomTooltip
                  text={t("tooltips.secretDescription")}
                  backgroundColor="rgba(91, 185, 163, 0.95)"
                  textColor="white"
                >
                  <StyledView className="w-12 h-20 bg-[#D4D4D4]/10 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                    <Feather name="lock" size={24} color="white" />
                  </StyledView>
                </CustomTooltip>
                <StyledView className="flex-1 relative" style={{ height: 80 }}>
                  <StyledTextInput
                    className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#eafffb]/40"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 16,
                      includeFontPadding: false,
                      paddingRight: 40,
                      height: 80,
                      maxHeight: 80,
                    }}
                    placeholder={t(
                      "effectSecretDescription",
                      "Descripción del secreto del efecto"
                    )}
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={trickData.secret}
                    onChangeText={(text) => updateTrickData({ secret: text })}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    scrollEnabled={true}
                  />
                  {/* Expand button */}
                  <StyledTouchableOpacity
                    onPress={() => setShowSecretModal(true)}
                    className="absolute bottom-2 right-2 w-8 h-8 rounded items-center justify-center"
                    style={{ zIndex: 10 }}
                  >
                    <Feather name="maximize-2" size={16} color="rgba(255, 255, 255, 0.7)" />
                  </StyledTouchableOpacity>
                </StyledView>
              </StyledView>
            </StyledView>
          </StyledView>

          {/* Photos Section */}
          <StyledView className="mb-16">
            <StyledText
              className="text-white text-lg mb-2"
              style={{
                fontFamily: fontNames.light,
                fontSize: 20,
                includeFontPadding: false,
              }}
            >
              {t("photos", "Fotos")}
            </StyledText>

            {/* Photos */}
            <MediaSelector
              ref={photosRef}
              type="photo"
              multiple={true}
              maxFiles={10}
              maxFileSize={10}
              quality={0.4}
              tooltip={t("tooltips.imageUpload")}
              placeholder={t("imagesUpload", "Subir Imágenes")}
              initialFiles={getInitialPhotos()}
              onFileRemoved={handleRemovePhoto}
              onFilesSelected={async (files) => {
                // Copiar TODAS las fotos inmediatamente
                const permanentUris = await Promise.all(
                  files.map(file => copyFileImmediately(file.uri))
                );

                updateTrickData({
                  localFiles: {
                    effectVideo: trickData.localFiles?.effectVideo || null,
                    secretVideo: trickData.localFiles?.secretVideo || null,
                    photos: permanentUris,
                  },
                });
              }}
              disableEncryption={true}
            />
          </StyledView>
        </StyledScrollView>

        <StyledView className="justify-end px-6 pb-6">
          {/* Step indicator */}
          <StyledText
            className="text-center text-white/60 mb-4"
            style={{
              fontFamily: fontNames.light,
              fontSize: 14,
              includeFontPadding: false,
            }}
          >
            {`${currentStep} de ${totalSteps}`}
          </StyledText>

          {/* Statistics Button */}
          <StyledTouchableOpacity
            className="w-full py-4 rounded-lg items-center justify-center flex-row bg-[#2C6B5C]"
            onPress={goToExtrasStep}
          >
            <StyledText
              className="text-white font-semibold text-base"
              style={{
                fontFamily: fontNames.light,
                fontSize: 18,
                includeFontPadding: false,
              }}
            >
              {t("statistics", "Estadísticas")}
            </StyledText>
            <StyledText
              className="text-white/60 text-base ml-1"
              style={{
                fontFamily: fontNames.extraLight,
                fontSize: 18,
                includeFontPadding: false,
              }}
            >
            </StyledText>
            <Feather
              name="chevron-right"
              size={20}
              color="white"
              style={{ position: "absolute", right: 16 }}
            />
          </StyledTouchableOpacity>
        </StyledView>

        {/* Modales de pantalla completa */}
        <FullScreenTextModal
          visible={showEffectModal}
          onClose={() => setShowEffectModal(false)}
          value={trickData.effect || ""}
          onSave={(text) => updateTrickData({ effect: text })}
          title={t("effectDescription", "Effect Description")}
          placeholder={t("describeEffect", "Describe what the audience sees...")}
        />

        <FullScreenTextModal
          visible={showSecretModal}
          onClose={() => setShowSecretModal(false)}
          value={trickData.secret || ""}
          onSave={(text) => updateTrickData({ secret: text })}
          title={t("secretDescription", "Secret Description")}
          placeholder={t("describeSecret", "Describe how the trick works...")}
        />
      </StyledView>
    </TouchableWithoutFeedback>
  );
}
