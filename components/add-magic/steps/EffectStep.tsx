"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { Feather, Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import type { EncryptedMagicTrick } from "../../../types/encryptedMagicTrick";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../lib/supabase";
import * as FileSystem from "expo-file-system";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { v4 as uuidv4 } from 'uuid';
import { useEncryption } from "../../../hooks/useEncryption";
import { FileEncryptionService } from "../../../utils/fileEncryption";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

interface StepProps {
  trickData: EncryptedMagicTrick;
  updateTrickData: (data: Partial<EncryptedMagicTrick>) => void;
  onNext?: () => void;
  onCancel?: () => void;
  currentStep?: number;
  totalSteps?: number;
  isSubmitting?: boolean;
  isNextButtonDisabled?: boolean;
  isLastStep?: boolean;
}

export default function EffectStepEncrypted({
  trickData,
  updateTrickData,
  onNext,
  onCancel,
  currentStep = 2,
  totalSteps = 3,
  isSubmitting = false,
  isNextButtonDisabled = false,
  isLastStep = false,
}: StepProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [uploadingType, setUploadingType] = useState<'effect' | 'secret' | null>(null);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Hooks de cifrado
  const {
    isReady: encryptionReady,
    keyPair,
    encryptForSelf,
    getPublicKey,
    error: encryptionError
  } = useEncryption();

  const fileEncryptionService = new FileEncryptionService();

  // Verificar que el cifrado esté listo
  useEffect(() => {
    if (!encryptionReady && !encryptionError) {
      console.log('Esperando inicialización del cifrado...')
    } else if (encryptionError) {
      console.error('Error en el cifrado:', encryptionError)
      Alert.alert(
        t('security.error', 'Error de Seguridad'),
        t('security.encryptionNotReady', 'El sistema de cifrado no está listo')
      )
    }
  }, [encryptionReady, encryptionError, t])

  // Request permissions
  const requestMediaLibraryPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("permissionRequired", "Permission Required"),
          t("mediaLibraryPermission", "We need access to your media library to upload videos."),
          [{ text: t("ok", "OK") }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error requesting permissions:", error);
      return false;
    }
  };

  // Actualizar contador de tags
  const updateTagsUsageCount = async (tagIds: string[]) => {
    try {
      if (!tagIds || tagIds.length === 0) return;

      for (const tagId of tagIds) {
        const { error } = await supabase.rpc("increment_tag_usage", {
          tag_id: tagId,
        });

        if (error) {
          console.error(`Error incrementing usage count for tag ${tagId}:`, error);
        }
      }
    } catch (error) {
      console.error("Error updating tag usage counts:", error);
    }
  };

  // Pick effect video
  const pickEffectVideo = async () => {
    try {
      if (!encryptionReady || !keyPair) {
        Alert.alert(
          t('security.error', 'Error de Seguridad'),
          t('security.encryptionNotReady', 'El sistema de cifrado no está listo')
        );
        return;
      }

      const hasPermission = await requestMediaLibraryPermissions();
      if (!hasPermission) return;

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.5,
        videoMaxDuration: 60,
      };

      const result = await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;

        // Check file size
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo.exists && "size" in fileInfo) {
            if (fileInfo.size > 50 * 1024 * 1024) {
              Alert.alert(
                t("fileTooLarge", "File Too Large"),
                t("fileSizeWarning", "The selected video is too large. Please select a smaller video or trim this one."),
                [{ text: t("ok", "OK") }]
              );
              return;
            }
          }
        } catch (error) {
          console.error("Error checking file size:", error);
        }

        await encryptAndStoreVideo(uri, 'effect');
      }
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert(
        t("error", "Error"),
        t("videoPickError", "There was an error selecting the video. Please try again."),
        [{ text: t("ok", "OK") }]
      );
    }
  };

  // Pick secret video
  const pickSecretVideo = async () => {
    try {
      if (!encryptionReady || !keyPair) {
        Alert.alert(
          t('security.error', 'Error de Seguridad'),
          t('security.encryptionNotReady', 'El sistema de cifrado no está listo')
        );
        return;
      }

      const hasPermission = await requestMediaLibraryPermissions();
      if (!hasPermission) return;

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.5,
        videoMaxDuration: 60,
      };

      const result = await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;

        // Check file size
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo.exists && "size" in fileInfo) {
            if (fileInfo.size > 50 * 1024 * 1024) {
              Alert.alert(
                t("fileTooLarge", "File Too Large"),
                t("fileSizeWarning", "The selected video is too large. Please select a smaller video or trim this one."),
                [{ text: t("ok", "OK") }]
              );
              return;
            }
          }
        } catch (error) {
          console.error("Error checking file size:", error);
        }

        await encryptAndStoreVideo(uri, 'secret');
      }
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert(
        t("error", "Error"),
        t("videoPickError", "There was an error selecting the video. Please try again."),
        [{ text: t("ok", "OK") }]
      );
    }
  };

  // Cifrar y almacenar video
  const encryptAndStoreVideo = async (uri: string, type: 'effect' | 'secret') => {
    if (!keyPair) return;

    try {
      setUploading(true);
      setUploadingType(type);

      // Obtener información del usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Cifrar y subir video
      const metadata = await fileEncryptionService.encryptAndUploadFile(
        uri,
        `${type}_video_${Date.now()}.mp4`,
        'video/mp4',
        user.id,
        [user.id], // Solo el autor tiene acceso
        getPublicKey,
        () => keyPair.privateKey
      );

      // Actualizar los datos del truco con el ID del archivo cifrado
      if (type === 'effect') {
        updateTrickData({ 
          effect_video_url: metadata.fileId,
          encryptedFiles: {
            ...trickData.encryptedFiles,
            effect_video: metadata.fileId
          }
        });
      } else {
        updateTrickData({ 
          secret_video_url: metadata.fileId,
          encryptedFiles: {
            ...trickData.encryptedFiles,
            secret_video: metadata.fileId
          }
        });
      }

      Alert.alert(
        t('security.success', 'Éxito'),
        t(type === 'effect' ? 'security.effectVideoEncrypted' : 'security.secretVideoEncrypted', 
          `Video ${type === 'effect' ? 'del efecto' : 'del secreto'} cifrado y almacenado`),
        [{ text: t('ok', 'OK') }]
      );

    } catch (error) {
      console.error(`Error cifrando video ${type}:`, error);
      Alert.alert(
        t('security.error', 'Error de Cifrado'),
        t('security.videoEncryptionError', 'No se pudo cifrar el video. Inténtalo de nuevo.'),
        [{ text: t('ok', 'OK') }]
      );
    } finally {
      setUploading(false);
      setUploadingType(null);
    }
  };

  // Navigate to extras step
  const goToExtrasStep = () => {
    if (onNext) {
      onNext();
    }
  };

  // Cifrar campos sensibles
  const encryptAllSensitiveFields = async (data: EncryptedMagicTrick): Promise<EncryptedMagicTrick> => {
    if (!keyPair) {
      throw new Error('Claves de cifrado no disponibles');
    }

    const encryptedData = { ...data };
    const encryptedFields: any = {};

    try {
      if (data.title?.trim()) {
        encryptedFields.title = await encryptForSelf(data.title.trim());
        encryptedData.title = "[ENCRYPTED]";
      }

      if (data.effect?.trim()) {
        encryptedFields.effect = await encryptForSelf(data.effect.trim());
        encryptedData.effect = "[ENCRYPTED]";
      }

      if (data.secret?.trim()) {
        encryptedFields.secret = await encryptForSelf(data.secret.trim());
        encryptedData.secret = "[ENCRYPTED]";
      }

      if (data.notes?.trim()) {
        encryptedFields.notes = await encryptForSelf(data.notes.trim());
        encryptedData.notes = "[ENCRYPTED]";
      }

      encryptedData.encryptedFields = encryptedFields;
      return encryptedData;
    } catch (error) {
      console.error('Error cifrando campos del truco:', error);
      throw new Error('Error al cifrar información del truco');
    }
  };

  // Save trick directly with encryption
  const handleRegisterMagic = async () => {
    try {
      setSaving(true);

      if (!trickData.effect?.trim() || !trickData.secret?.trim()) {
        Alert.alert(
          t("validationError", "Error de Validación"),
          t("requiredFieldsMissing", "Por favor complete todos los campos obligatorios."),
          [{ text: t("ok", "OK") }]
        );
        return;
      }

      if (!keyPair) {
        Alert.alert(
          t("security.encryptionRequired", "Cifrado Requerido"),
          t("security.setupEncryptionFirst", "El sistema de cifrado no está configurado"),
          [{ text: t("ok", "OK") }]
        );
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t("error"), t("userNotFound", "Usuario no encontrado"));
        return;
      }

      // Ensure user profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!existingProfile) {
        const username = user.email?.split("@")[0] || "";
        await supabase.from("profiles").insert({
          id: user.id,
          email: user.email || "",
          username: username,
          is_active: true,
          is_verified: false,
          subscription_type: "free",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Cifrar campos sensibles
      const encryptedTrickData = await encryptAllSensitiveFields(trickData);
      
      // Generar ID único
      const trickId = uuidv4();

      // Usar RPC para crear el truco cifrado
      const { data, error } = await supabase.rpc('create_encrypted_magic_trick', {
        trick_id: trickId,
        trick_data: {
          user_id: user.id,
          title: encryptedTrickData.title,
          effect: encryptedTrickData.effect,
          secret: encryptedTrickData.secret,
          duration: encryptedTrickData.duration,
          angles: encryptedTrickData.angles,
          notes: encryptedTrickData.notes || "[ENCRYPTED]",
          special_materials: encryptedTrickData.special_materials,
          is_public: false,
          status: "draft",
          price: null,
          photo_url: encryptedTrickData.photo_url,
          effect_video_url: trickData.encryptedFiles?.effect_video || encryptedTrickData.effect_video_url,
          secret_video_url: trickData.encryptedFiles?.secret_video || encryptedTrickData.secret_video_url,
          views_count: 0,
          likes_count: 0,
          dislikes_count: 0,
          version: 1,
          parent_trick_id: null,
          reset: encryptedTrickData.reset,
          difficulty: encryptedTrickData.difficulty,
          is_encrypted: true,
        },
        encryption_metadata: {
          content_type: "magic_tricks",
          user_id: user.id,
          encrypted_fields: encryptedTrickData.encryptedFields,
          encrypted_files: trickData.encryptedFiles || {},
        }
      });

      if (error) {
        console.error("Error creating trick:", error);
        Alert.alert(t("error"), t("errorCreatingTrick", "Error creando el truco"));
        return;
      }

      // Associate category
      if (trickData.selectedCategoryId) {
        await supabase.from("trick_categories").insert({
          trick_id: trickId,
          category_id: trickData.selectedCategoryId,
          created_at: new Date().toISOString(),
        });
      }

      // Associate tags
      if (trickData.tags.length > 0) {
        const tagInserts = trickData.tags.map(tagId => ({
          trick_id: trickId,
          tag_id: tagId,
          created_at: new Date().toISOString(),
        }));

        await supabase.from("trick_tags").insert(tagInserts);
        await updateTagsUsageCount(trickData.tags);
      }

      Alert.alert(
        t("success", "Éxito"),
        t("trickCreatedSuccessfully", "El truco ha sido creado y cifrado exitosamente"),
        [{ text: t("ok", "OK") }]
      );

      router.replace("/(app)/home");
    } catch (error) {
      console.error("Error saving trick:", error);
      Alert.alert(
        t("error", "Error"),
        error instanceof Error ? error.message : t("unexpectedError", "Ocurrió un error inesperado"),
        [{ text: t("ok", "OK") }]
      );
    } finally {
      setSaving(false);
    }
  };

  return (
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
      <StyledView className="flex-row items-center px-6 pt-4 pb-4">
        <StyledTouchableOpacity onPress={onCancel} className="p-2">
          <Feather name="chevron-left" size={24} color="white" />
        </StyledTouchableOpacity>

        <StyledView className="flex-1 items-center">
          <StyledText className="text-white text-lg font-semibold">
            {trickData.title || t("trickTitle", "[Title Magic]")}
          </StyledText>
          <StyledText className="text-emerald-200 text-sm opacity-70">
            {t("content", "Contenido")}
          </StyledText>
        </StyledView>

        <StyledTouchableOpacity className="p-2">
          <MaterialIcons name="security" size={24} color="#10b981" />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1 px-6">
        {/* Security Notice */}
        <StyledView className="bg-emerald-500/20 rounded-lg p-4 mb-6 border border-emerald-500/30">
          <StyledView className="flex-row items-center mb-2">
            <MaterialIcons name="security" size={20} color="#10b981" />
            <StyledText className="text-emerald-200 font-semibold ml-3">
              {t("security.secretsProtected", "Secretos Protegidos")}
            </StyledText>
          </StyledView>
          <StyledText className="text-emerald-200/80 text-sm">
            {t("security.magicSecretsNotice", "El efecto y secreto de tu truco serán cifrados para proteger tu propiedad intelectual.")}
          </StyledText>
        </StyledView>

        {/* Effect Section */}
        <StyledView className="mt-6 mb-6">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("effect", "Efecto")}
          </StyledText>

          {/* Effect Video */}
          <StyledView className="flex-row mb-4">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="video" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTouchableOpacity
                onPress={pickEffectVideo}
                disabled={uploading || !encryptionReady}
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
              >
                <StyledView className="flex-1 flex-row items-center">
                  {uploading && uploadingType === 'effect' ? (
                    <>
                      <ActivityIndicator size="small" color="#10b981" />
                      <StyledText className="text-white/70 ml-2">
                        {t("security.encryptingVideo", "Cifrando video...")}
                      </StyledText>
                    </>
                  ) : (
                    <>
                      <StyledText className="text-white/70 flex-1">
                        {trickData.encryptedFiles?.effect_video
                          ? t("security.videoEncrypted", "Video cifrado ✓")
                          : t("uploadEffectVideo", "Subir video del efecto*")}
                      </StyledText>
                      <StyledView className="flex-row items-center">
                        <MaterialIcons name="security" size={16} color="#10b981" />
                        <Feather name="upload" size={16} color="white" style={{ marginLeft: 4 }} />
                      </StyledView>
                    </>
                  )}
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Effect Description */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-19 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
              <Feather name="star" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledView className="flex-row items-center mb-2">
                <StyledText className="text-white flex-1 ml-1">
                  {t("effectDescription", "Descripción del efecto")}
                </StyledText>
                <MaterialIcons name="security" size={16} color="#10b981" />
              </StyledView>
              <StyledTextInput
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] min-h-[80px]"
                placeholder={t("effectShortDescription", "Descripción corta del efecto")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={trickData.effect}
                onChangeText={(text) => updateTrickData({ effect: text })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Secret Section */}
        <StyledView className="mb-6">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("secret", "Secreto")}
          </StyledText>

          {/* Secret Video */}
          <StyledView className="flex-row mb-4">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="video" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1 ml-3">
              <StyledTouchableOpacity
                onPress={pickSecretVideo}
                disabled={uploading || !encryptionReady}
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
              >
                <StyledView className="flex-1 flex-row items-center">
                  {uploading && uploadingType === 'secret' ? (
                    <>
                      <ActivityIndicator size="small" color="#10b981" />
                      <StyledText className="text-white/70 ml-2">
                        {t("security.encryptingVideo", "Cifrando video...")}
                      </StyledText>
                    </>
                  ) : (
                    <>
                      <StyledText className="text-white/70 flex-1">
                        {trickData.encryptedFiles?.secret_video
                          ? t("security.videoEncrypted", "Video cifrado ✓")
                          : t("secretVideoUpload", "Subir video del secreto")}
                      </StyledText>
                      <StyledView className="flex-row items-center">
                        <MaterialIcons name="security" size={16} color="#10b981" />
                        <Feather name="upload" size={16} color="white" style={{ marginLeft: 4 }} />
                      </StyledView>
                    </>
                  )}
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Secret Description */}
          <StyledView className="flex-row mb-28">
            <StyledView className="w-12 h-19 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
              <Feather name="lock" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1 ml-3">
              <StyledView className="flex-row items-center mb-2">
                <StyledText className="text-white flex-1 ml-1">
                  {t("secretDescription", "Descripción del secreto")}
                </StyledText>
                <MaterialIcons name="security" size={16} color="#10b981" />
              </StyledView>
              <StyledTextInput
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] min-h-[80px]"
                placeholder={t("effectSecretDescription", "Descripción del secreto del efecto")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={trickData.secret}
                onChangeText={(text) => updateTrickData({ secret: text })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Step indicator */}
        <StyledText className="text-center text-white/60 mb-4">
          {`${currentStep} de ${totalSteps}`}
        </StyledText>

        {/* Statistics Button */}
        <StyledTouchableOpacity
          className="w-full py-4 rounded-lg items-center justify-center flex-row border border-[#2C6B5C] bg-transparent mb-4"
          onPress={goToExtrasStep}
        >
          <StyledText className="text-white font-semibold text-base">
            {t("statistics", "Estadísticas")}
          </StyledText>
          <StyledText className="text-white/60 text-base ml-1">
            {t("optional", "(Opcional)")}
          </StyledText>
          <Feather
            name="chevron-right"
            size={20}
            color="white"
            style={{ position: "absolute", right: 16 }}
          />
        </StyledTouchableOpacity>

        {/* Register Magic Button */}
        <StyledTouchableOpacity
          className={`w-full py-4 rounded-lg items-center justify-center flex-row mb-6 ${
            saving || !trickData.effect.trim() || !trickData.secret.trim() || !encryptionReady
              ? "bg-white/10"
              : "bg-emerald-700"
          }`}
          disabled={
            saving || !trickData.effect.trim() || !trickData.secret.trim() || !encryptionReady
          }
          onPress={handleRegisterMagic}
        >
          <StyledText className="text-white font-semibold text-base">
            {saving
              ? t("saving", "Guardando...")
              : t("registerMagic", "Registrar Magia")}
          </StyledText>
          {saving ? (
            <Ionicons
              name="refresh"
              size={20}
              color="white"
              style={{ marginLeft: 8 }}
            />
          ) : (
            <MaterialIcons 
              name="security" 
              size={20} 
              color="white" 
              style={{ marginLeft: 8 }}
            />
          )}
        </StyledTouchableOpacity>
      </StyledScrollView>
    </StyledView>
  );
}