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
import {
  Feather,
  Ionicons,
  FontAwesome5,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import type { EncryptedMagicTrick } from "../../../types/encryptedMagicTrick";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../lib/supabase";
import * as FileSystem from "expo-file-system";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { v4 as uuidv4 } from "uuid";
import { useEncryption } from "../../../hooks/useEncryption";
import { FileEncryptionService } from "../../../utils/fileEncryption";
import CustomTooltip from "../../ui/Tooltip";
import SuccessCreationModal from "../../ui/SuccessCreationModal";

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
  onViewItem?: (trickId: string) => void;
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
  onViewItem,
  currentStep = 2,
  totalSteps = 3,
  isSubmitting = false,
  isNextButtonDisabled = false,
  isLastStep = false,
}: StepProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);
  
  // Estados para archivos locales
  const [localEffectVideo, setLocalEffectVideo] = useState<string | null>(null);
  const [localSecretVideo, setLocalSecretVideo] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Hooks de cifrado
  const {
    isReady: encryptionReady,
    keyPair,
    encryptForSelf,
    getPublicKey,
    error: encryptionError,
  } = useEncryption();

  const fileEncryptionService = new FileEncryptionService();

  // Verificar que el cifrado esté listo
  useEffect(() => {
    if (!encryptionReady && !encryptionError) {
    } else if (encryptionError) {
      console.error("Error en el cifrado:", encryptionError);
      Alert.alert(
        t("security.error", "Error de Seguridad"),
        t("security.encryptionNotReady", "El sistema de cifrado no está listo")
      );
    }
  }, [encryptionReady, encryptionError, t]);

  // Inicializar archivos locales desde trickData si existen
  useEffect(() => {
    if (trickData.localFiles?.effectVideo) {
      setLocalEffectVideo(trickData.localFiles.effectVideo);
    }
    if (trickData.localFiles?.secretVideo) {
      setLocalSecretVideo(trickData.localFiles.secretVideo);
    }
  }, []);

  // Request permissions
  const requestMediaLibraryPermissions = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("permissionRequired", "Permission Required"),
          t(
            "mediaLibraryPermission",
            "We need access to your media library to upload videos."
          ),
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
          console.error(
            `Error incrementing usage count for tag ${tagId}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error updating tag usage counts:", error);
    }
  };

  // Pick effect video (solo guardar localmente)
  const pickEffectVideo = async () => {
    try {
      if (!encryptionReady || !keyPair) {
        Alert.alert(
          t("security.error", "Error de Seguridad"),
          t(
            "security.encryptionNotReady",
            "El sistema de cifrado no está listo"
          )
        );
        return;
      }

      const hasPermission = await requestMediaLibraryPermissions();
      if (!hasPermission) return;

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["videos"],
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
                t(
                  "fileSizeWarning",
                  "The selected video is too large. Please select a smaller video or trim this one."
                ),
                [{ text: t("ok", "OK") }]
              );
              return;
            }
          }
        } catch (error) {
          console.error("Error checking file size:", error);
        }

        // Guardar localmente
        setLocalEffectVideo(uri);
        updateTrickData({
          localFiles: {
            ...trickData.localFiles,
            effectVideo: uri
          }
        });
      }
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert(
        t("error", "Error"),
        t(
          "videoPickError",
          "There was an error selecting the video. Please try again."
        ),
        [{ text: t("ok", "OK") }]
      );
    }
  };

  // Pick secret video (solo guardar localmente)
  const pickSecretVideo = async () => {
    try {
      if (!encryptionReady || !keyPair) {
        Alert.alert(
          t("security.error", "Error de Seguridad"),
          t(
            "security.encryptionNotReady",
            "El sistema de cifrado no está listo"
          )
        );
        return;
      }

      const hasPermission = await requestMediaLibraryPermissions();
      if (!hasPermission) return;

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["videos"],
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
                t(
                  "fileSizeWarning",
                  "The selected video is too large. Please select a smaller video or trim this one."
                ),
                [{ text: t("ok", "OK") }]
              );
              return;
            }
          }
        } catch (error) {
          console.error("Error checking file size:", error);
        }

        // Guardar localmente
        setLocalSecretVideo(uri);
        updateTrickData({
          localFiles: {
            ...trickData.localFiles,
            secretVideo: uri
          }
        });
      }
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert(
        t("error", "Error"),
        t(
          "videoPickError",
          "There was an error selecting the video. Please try again."
        ),
        [{ text: t("ok", "OK") }]
      );
    }
  };

  // Eliminar video del efecto
  const removeEffectVideo = () => {
    setLocalEffectVideo(null);
    updateTrickData({
      localFiles: {
        ...trickData.localFiles,
        effectVideo: null
      }
    });
  };

  // Eliminar video del secreto
  const removeSecretVideo = () => {
    setLocalSecretVideo(null);
    updateTrickData({
      localFiles: {
        ...trickData.localFiles,
        secretVideo: null
      }
    });
  };

  // Navigate to extras step
  const goToExtrasStep = () => {
    if (onNext) {
      onNext();
    }
  };

  // Cifrar y subir todos los archivos
  const uploadAllFiles = async () => {
    if (!keyPair) return {};

    const uploadedFiles: any = {};
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    try {
      // Subir video del efecto si existe
      if (localEffectVideo) {
        const metadata = await fileEncryptionService.encryptAndUploadFile(
          localEffectVideo,
          `effect_video_${Date.now()}.mp4`,
          "video/mp4",
          user.id,
          [user.id],
          getPublicKey,
          () => keyPair.privateKey
        );
        uploadedFiles.effect_video = metadata.fileId;
      }

      // Subir video del secreto si existe
      if (localSecretVideo) {
        const metadata = await fileEncryptionService.encryptAndUploadFile(
          localSecretVideo,
          `secret_video_${Date.now()}.mp4`,
          "video/mp4",
          user.id,
          [user.id],
          getPublicKey,
          () => keyPair.privateKey
        );
        uploadedFiles.secret_video = metadata.fileId;
      }

      return uploadedFiles;
    } catch (error) {
      console.error("Error uploading files:", error);
      throw error;
    }
  };

  // Cifrar campos sensibles
  const encryptAllSensitiveFields = async (
    data: EncryptedMagicTrick
  ): Promise<EncryptedMagicTrick> => {
    if (!keyPair) {
      throw new Error("Claves de cifrado no disponibles");
    }

    const encryptedData = { ...data };
    const encryptedFields: any = {};

    try {
      // Solo cifrar si el campo tiene contenido
      if (data.title?.trim()) {
        encryptedFields.title = await encryptForSelf(data.title.trim());
        encryptedData.title = "[ENCRYPTED]";
      } else {
        encryptedData.title = "";
      }

      if (data.effect?.trim()) {
        encryptedFields.effect = await encryptForSelf(data.effect.trim());
        encryptedData.effect = "[ENCRYPTED]";
      } else {
        encryptedData.effect = "";
      }

      if (data.secret?.trim()) {
        encryptedFields.secret = await encryptForSelf(data.secret.trim());
        encryptedData.secret = "[ENCRYPTED]";
      } else {
        encryptedData.secret = "";
      }

      if (data.notes?.trim()) {
        encryptedFields.notes = await encryptForSelf(data.notes.trim());
        encryptedData.notes = "[ENCRYPTED]";
      } else {
        encryptedData.notes = "";
      }

      encryptedData.encryptedFields = encryptedFields;
      return encryptedData;
    } catch (error) {
      console.error("Error cifrando campos del truco:", error);
      throw new Error("Error al cifrar información del truco");
    }
  };

  // Save trick directly with encryption
  const handleRegisterMagic = async () => {
    try {
      setSaving(true);

      if (!keyPair) {
        Alert.alert(
          t("security.encryptionRequired", "Cifrado Requerido"),
          t(
            "security.setupEncryptionFirst",
            "El sistema de cifrado no está configurado"
          ),
          [{ text: t("ok", "OK") }]
        );
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
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

      // Subir todos los archivos
      const uploadedFiles = await uploadAllFiles();

      // Cifrar campos sensibles
      const encryptedTrickData = await encryptAllSensitiveFields(trickData);

      // Generar ID único
      const trickId = uuidv4();

      // Usar RPC para crear el truco cifrado
      const { data, error } = await supabase.rpc(
        "create_encrypted_magic_trick",
        {
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
            effect_video_url: uploadedFiles.effect_video || null,
            secret_video_url: uploadedFiles.secret_video || null,
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
            encrypted_files: uploadedFiles,
          },
        }
      );

      if (error) {
        console.error("Error creating trick:", error);
        Alert.alert(
          t("error"),
          t("errorCreatingTrick", "Error creando el truco")
        );
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
        const tagInserts = trickData.tags.map((tagId) => ({
          trick_id: trickId,
          tag_id: tagId,
          created_at: new Date().toISOString(),
        }));

        await supabase.from("trick_tags").insert(tagInserts);
        await updateTagsUsageCount(trickData.tags);
      }

      setCreatedItemId(trickId);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error saving trick:", error);
      Alert.alert(
        t("error", "Error"),
        error instanceof Error
          ? error.message
          : t("unexpectedError", "Ocurrió un error inesperado"),
        [{ text: t("ok", "OK") }]
      );
    } finally {
      setSaving(false);
    }
  };

  // Modal handlers
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    router.replace("/(app)/home");
  };

  const handleViewItem = async () => {
    setShowSuccessModal(false);
    if (createdItemId) {
      try {
        // Obtener datos del truco
        const { data: trickData } = await supabase
          .from("magic_tricks")
          .select(
            `
            *,
            trick_categories!inner(category_id)
          `
          )
          .eq("id", createdItemId)
          .single();

        if (trickData) {
          // Obtener nombre de categoría
          let categoryName = "Unknown";
          if (trickData.trick_categories?.[0]?.category_id) {
            const { data: categoryData } = await supabase
              .from("user_categories")
              .select("name")
              .eq("id", trickData.trick_categories[0].category_id)
              .single();

            if (categoryData) categoryName = categoryData.name;
          }

          // Preparar datos para navegación
          const navigationData = {
            id: trickData.id,
            title: trickData.title,
            category: categoryName,
            effect: trickData.effect || "",
            secret: trickData.secret || "",
            effect_video_url: trickData.effect_video_url,
            secret_video_url: trickData.secret_video_url,
            photo_url: trickData.photo_url,
            photos: trickData.encryptedFiles?.photos || [],
            script: "",
            angles: trickData.angles || [],
            duration: trickData.duration || 0,
            reset: trickData.reset || 0,
            difficulty: trickData.difficulty || 0,
            is_encrypted: trickData.is_encrypted,
            notes: trickData.notes,
          };

          // Navegar a página del truco
          router.push({
            pathname: "/trick/[id]",
            params: {
              id: createdItemId,
              trick: JSON.stringify(navigationData),
            },
          });
        }
      } catch (error) {
        console.error("Error loading trick:", error);
        if (onViewItem) onViewItem(createdItemId);
      }
    }
  };

  const handleAddAnother = () => {
    setShowSuccessModal(false);
    router.replace("/(app)/add-magic");
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

        <StyledTouchableOpacity className="p-2 opacity-0">
          <MaterialIcons name="security" size={24} color="#10b981" />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1 px-6">
        {/* Effect Section */}
        <StyledView className="mt-6">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("effect", "Efecto")}
          </StyledText>

          {/* Effect Video */}
          <StyledView className="flex-row mb-6">
            <CustomTooltip
              text={t("tooltips.effectVideo")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                <Feather name="video" size={24} color="white" />
              </StyledView>
            </CustomTooltip>
            <StyledView className="flex-1 ">
              <StyledTouchableOpacity
                onPress={localEffectVideo ? removeEffectVideo : pickEffectVideo}
                disabled={!encryptionReady}
                className="flex-1 text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#eafffb]/40"
              >
                <StyledView className="flex-1 flex-row items-center">
                  <StyledText className="text-white/70 flex-1">
                    {localEffectVideo
                      ? t("effectVideoSelected", "Video del efecto seleccionado")
                      : t("uploadEffectVideo", "Subir video del efecto*")}
                  </StyledText>
                  <StyledView className="flex-row items-center">
                    <Feather
                      name={localEffectVideo ? "x" : "upload"}
                      size={16}
                      color={localEffectVideo ? "#ef4444" : "white"}
                      style={{ marginLeft: 4 }}
                    />
                  </StyledView>
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Effect Description */}
          <StyledView className="mb-6">
            <StyledView className="flex-row items-center">
              <CustomTooltip
                text={t("tooltips.effectDescription")}
                backgroundColor="rgba(91, 185, 163, 0.95)"
                textColor="white"
              >
                <StyledView className="w-12 h-20 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                  <MaterialCommunityIcons
                    name="creation"
                    size={24}
                    color="white"
                  />
                </StyledView>
              </CustomTooltip>
              <StyledView className="flex-1 ">
                <StyledView className="flex-row"></StyledView>
                <StyledTextInput
                  className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#eafffb]/40 min-h-[80px]"
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
                />
              </StyledView>
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Secret Section */}
        <StyledView className="mb-6">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("secret", "Secreto")}
          </StyledText>

          {/* Secret Video */}
          <StyledView className="flex-row mb-6">
            <CustomTooltip
              text={t("tooltips.secretVideo")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                <Feather name="video" size={24} color="white" />
              </StyledView>
            </CustomTooltip>
            <StyledView className="flex-1 ">
              <StyledTouchableOpacity
                onPress={localSecretVideo ? removeSecretVideo : pickSecretVideo}
                disabled={!encryptionReady}
                className="flex-1 text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#eafffb]/40"
              >
                <StyledView className="flex-1 flex-row items-center">
                  <StyledText className="text-white/70 flex-1">
                    {localSecretVideo
                      ? t("secretVideoSelected", "Video del secreto seleccionado")
                      : t("secretVideoUpload", "Subir video del secreto")}
                  </StyledText>
                  <StyledView className="flex-row items-center">
                    <Feather
                      name={localSecretVideo ? "x" : "upload"}
                      size={16}
                      color={localSecretVideo ? "#ef4444" : "white"}
                      style={{ marginLeft: 4 }}
                    />
                  </StyledView>
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Secret Description */}
          <StyledView className="mb-16">
            <StyledView className="flex-row items-center">
              <CustomTooltip
                text={t("tooltips.secretDescription")}
                backgroundColor="rgba(91, 185, 163, 0.95)"
                textColor="white"
              >
                <StyledView className="w-12 h-20 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                  <Feather name="lock" size={24} color="white" />
                </StyledView>
              </CustomTooltip>
              <StyledView className="flex-1 ">
                <StyledView className="flex-row"></StyledView>
                <StyledTextInput
                  className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#eafffb]/40 min-h-[80px]"
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
                />
              </StyledView>
            </StyledView>
          </StyledView>
        </StyledView>
      </StyledScrollView>
      <StyledView className="justify-end px-6 pb-6">
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
            saving || !encryptionReady ? "bg-white/10" : "bg-emerald-700"
          }`}
          disabled={saving || !encryptionReady}
          onPress={handleRegisterMagic}
        >
          <StyledText className="text-white font-semibold text-base">
            {saving
              ? t("saving", "Guardando...")
              : t("registerMagic", "Registrar Magia")}
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>
      {/* Success Modal */}
      <SuccessCreationModal
        visible={showSuccessModal}
        onClose={handleCloseSuccessModal}
        onViewItem={handleViewItem}
        onAddAnother={handleAddAnother}
        itemName={trickData.title || t("common.trick", "Trick")}
        itemType="trick"
      />
    </StyledView>
  );
}