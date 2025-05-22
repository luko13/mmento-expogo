"use client";

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  Switch,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { Technique } from "../AddTechniqueWizard";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../lib/supabase";
import * as FileSystem from "expo-file-system";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledSwitch = styled(Switch);

interface StepProps {
  techniqueData: Technique;
  updateTechniqueData: (data: Partial<Technique>) => void;
  onNext?: () => void;
  onCancel?: () => void;
  currentStep?: number;
  totalSteps?: number;
  isSubmitting?: boolean;
  isNextButtonDisabled?: boolean;
  isLastStep?: boolean;
}

export default function TechniqueDetailsStep({
  techniqueData,
  updateTechniqueData,
  onNext,
  onCancel,
  currentStep = 2,
  totalSteps = 2,
  isSubmitting = false,
  isNextButtonDisabled = false,
  isLastStep = true,
}: StepProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Opciones de selección de ángulos
  const angles = [
    { value: "90", label: "90°" },
    { value: "120", label: "120°" },
    { value: "180", label: "180°" },
    { value: "360", label: "360°" },
  ];

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
            "We need access to your media library to upload media."
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

  // Seleccionar ángulo (estilo botón de radio)
  const selectAngle = (angle: string): void => {
    const updatedAngles = techniqueData.angles.includes(angle)
      ? techniqueData.angles.filter((a) => a !== angle)
      : [...techniqueData.angles, angle];

    updateTechniqueData({ angles: updatedAngles });
  };

  // Upload image
  const pickImage = async () => {
    try {
      // Request permissions first
      const hasPermission = await requestMediaLibraryPermissions();
      if (!hasPermission) return;

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        aspect: [4, 3] as [number, number],
      };

      const result = await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;

        // Check file size
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);

          if (fileInfo.exists && "size" in fileInfo) {
            if (fileInfo.size > 10 * 1024 * 1024) {
              Alert.alert(
                t("fileTooLarge", "File Too Large"),
                t(
                  "imageSizeWarning",
                  "The selected image is too large. Please select a smaller image."
                ),
                [{ text: t("ok", "OK") }]
              );
              return;
            }
          }
        } catch (error) {
          console.error("Error checking file size:", error);
        }

        await uploadImage(uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(
        t("error", "Error"),
        t(
          "imagePickError",
          "There was an error selecting the image. Please try again."
        ),
        [{ text: t("ok", "OK") }]
      );
    }
  };

  // Upload video
  const pickVideo = async () => {
    try {
      // Request permissions first
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

        await uploadVideo(uri);
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

  // Upload image to Supabase Storage
  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);

      const fileName = uri.split("/").pop() || "";
      const fileExt = fileName.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `technique_images/${Date.now()}.${fileExt}`;

      if (Platform.OS === "ios") {
        try {
          const fileContent = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const { data, error } = await supabase.storage
            .from("technique_media")
            .upload(filePath, fileContent, {
              contentType: `image/${fileExt}`,
              upsert: true,
            });

          if (error) {
            console.error("Error uploading image:", error);
            Alert.alert(t("uploadError", "Upload Error"), error.message);
            return;
          }

          const { data: publicURL } = supabase.storage
            .from("technique_media")
            .getPublicUrl(filePath);

          updateTechniqueData({ image_url: publicURL.publicUrl });
        } catch (error) {
          console.error("Error reading file:", error);
          Alert.alert(
            t("fileReadError", "File Read Error"),
            t(
              "couldNotReadFile",
              "Could not read the image file. Please try again with a different image."
            )
          );
        }
      } else {
        const response = await fetch(uri);
        const blob = await response.blob();

        const { data, error } = await supabase.storage
          .from("technique_media")
          .upload(filePath, blob);

        if (error) {
          console.error("Error uploading image:", error);
          Alert.alert(t("uploadError", "Upload Error"), error.message);
          return;
        }

        const { data: publicURL } = supabase.storage
          .from("technique_media")
          .getPublicUrl(filePath);

        updateTechniqueData({ image_url: publicURL.publicUrl });
      }
    } catch (error) {
      console.error("Error in upload process:", error);
      Alert.alert(
        t("uploadError", "Upload Error"),
        t(
          "generalUploadError",
          "There was an error uploading the image. Please try again."
        )
      );
    } finally {
      setUploading(false);
    }
  };

  // Upload video to Supabase Storage
  const uploadVideo = async (uri: string) => {
    try {
      setUploading(true);

      const fileName = uri.split("/").pop() || "";
      const fileExt = fileName.split(".").pop()?.toLowerCase() || "mp4";
      const filePath = `technique_videos/${Date.now()}.${fileExt}`;

      if (Platform.OS === "ios") {
        try {
          const fileContent = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const { data, error } = await supabase.storage
            .from("technique_media")
            .upload(filePath, fileContent, {
              contentType: `video/${fileExt}`,
              upsert: true,
            });

          if (error) {
            console.error("Error uploading video:", error);
            Alert.alert(t("uploadError", "Upload Error"), error.message);
            return;
          }

          const { data: publicURL } = supabase.storage
            .from("technique_media")
            .getPublicUrl(filePath);

          updateTechniqueData({ video_url: publicURL.publicUrl });
        } catch (error) {
          console.error("Error reading file:", error);
          Alert.alert(
            t("fileReadError", "File Read Error"),
            t(
              "couldNotReadFile",
              "Could not read the video file. Please try again with a different video."
            )
          );
        }
      } else {
        const response = await fetch(uri);
        const blob = await response.blob();

        const { data, error } = await supabase.storage
          .from("technique_media")
          .upload(filePath, blob);

        if (error) {
          console.error("Error uploading video:", error);
          Alert.alert(t("uploadError", "Upload Error"), error.message);
          return;
        }

        const { data: publicURL } = supabase.storage
          .from("technique_media")
          .getPublicUrl(filePath);

        updateTechniqueData({ video_url: publicURL.publicUrl });
      }
    } catch (error) {
      console.error("Error in upload process:", error);
      Alert.alert(
        t("uploadError", "Upload Error"),
        t(
          "generalUploadError",
          "There was an error uploading the video. Please try again."
        )
      );
    } finally {
      setUploading(false);
    }
  };

  // Función para agregar material especial
  const addSpecialMaterial = () => {
    Alert.prompt(
      t("addSpecialMaterial", "Add Special Material"),
      t("enterMaterialName", "Enter the name of the special material"),
      [
        {
          text: t("cancel", "Cancel"),
          style: "cancel",
        },
        {
          text: t("add", "Add"),
          onPress: (text) => {
            if (text && text.trim()) {
              const updatedMaterials = [...techniqueData.special_materials, text.trim()];
              updateTechniqueData({ special_materials: updatedMaterials });
            }
          },
        },
      ],
      "plain-text"
    );
  };

  // Función para eliminar material especial
  const removeSpecialMaterial = (index: number) => {
    const updatedMaterials = techniqueData.special_materials.filter((_, i) => i !== index);
    updateTechniqueData({ special_materials: updatedMaterials });
  };

  // Función para guardar la técnica directamente
  const handleCreateTechnique = async () => {
    try {
      setSaving(true);

      // Validar que los campos necesarios estén completos
      if (!techniqueData.name?.trim() || !techniqueData.description?.trim()) {
        Alert.alert(
          t("validationError", "Error de Validación"),
          t(
            "requiredFieldsMissing",
            "Por favor complete todos los campos obligatorios."
          ),
          [{ text: t("ok", "OK") }]
        );
        return;
      }

      // Obtener el usuario actual
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No user found");
        Alert.alert(t("error"), t("userNotFound", "Usuario no encontrado"));
        return;
      }

      // Verificar si el usuario ya tiene un perfil
      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error checking profile:", profileError);
        throw new Error("Error checking user profile");
      }

      // Si el perfil no existe, crearlo
      if (!existingProfile) {
        const username = user.email?.split("@")[0] || "";

        const { error: insertError } = await supabase.from("profiles").insert({
          id: user.id,
          email: user.email || "",
          username: username,
          is_active: true,
          is_verified: false,
          subscription_type: "free",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error("Error creating profile:", insertError);
          throw new Error("Could not create user profile");
        }
      }

      // Insertar la técnica en la base de datos
      const { data, error } = await supabase
        .from("techniques")
        .insert({
          user_id: user.id,
          name: techniqueData.name.trim(),
          description: techniqueData.description.trim(),
          difficulty: techniqueData.difficulty,
          angles:
            techniqueData.angles.length > 0
              ? JSON.stringify(techniqueData.angles)
              : null,
          notes: techniqueData.notes?.trim() || "",
          special_materials: techniqueData.special_materials,
          image_url: techniqueData.image_url,
          video_url: techniqueData.video_url,
          is_public: techniqueData.is_public,
          status: techniqueData.status,
          price: techniqueData.price,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating technique:", error);
        Alert.alert(
          t("error"),
          t("errorCreatingTechnique", "Error creando la técnica")
        );
        return;
      }

      // Mensaje de éxito
      Alert.alert(
        t("success", "Éxito"),
        t("techniqueCreatedSuccessfully", "La técnica ha sido creada exitosamente"),
        [{ text: t("ok", "OK") }]
      );

      // Navegar a la pantalla principal
      router.replace("/(app)/home");
    } catch (error) {
      console.error("Error saving technique:", error);
      Alert.alert(
        t("error", "Error"),
        t("unexpectedError", "Ocurrió un error inesperado"),
        [{ text: t("ok", "OK") }]
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <StyledView className="flex-1">
      {/* Background gradient */}
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
            {techniqueData.name || t("techniqueTitle", "[Technique Name]")}
          </StyledText>
          <StyledText className="text-emerald-200 text-sm opacity-70">
            {t("details", "Details")}
          </StyledText>
        </StyledView>

        <StyledTouchableOpacity className="p-2">
          <Feather name="info" size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1 px-6">
        {/* Statistics Section */}
        <StyledView className="mt-6">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("statistics", "Statistics")}
          </StyledText>

          {/* Angles Selection */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="tag" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledText className="text-white mb-2 ml-1">
                {t("angles", "Angles")}
              </StyledText>
              <StyledView className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between">
                {angles.map((angle) => (
                  <StyledTouchableOpacity
                    key={angle.value}
                    onPress={() => selectAngle(angle.value)}
                    className="flex-row items-center"
                  >
                    <StyledView
                      className={`w-5 h-5 rounded-full border ${
                        techniqueData.angles.includes(angle.value)
                          ? "border-white bg-white"
                          : "border-white/50"
                      } mr-2`}
                    >
                      {techniqueData.angles.includes(angle.value) && (
                        <StyledView className="w-3 h-3 rounded-full bg-emerald-800 m-auto" />
                      )}
                    </StyledView>
                    <StyledText className="text-white">
                      {angle.label}
                    </StyledText>
                  </StyledTouchableOpacity>
                ))}
              </StyledView>
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Media Section */}
        <StyledView className="mb-6">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("media", "Media")}
          </StyledText>

          {/* Image Upload */}
          <StyledView className="flex-row mb-4">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="image" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTouchableOpacity
                onPress={pickImage}
                disabled={uploading}
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
              >
                <StyledText className="text-white/70">
                  {uploading
                    ? t("uploading", "Uploading...")
                    : techniqueData.image_url
                    ? t("imageUploaded", "Image uploaded")
                    : t("uploadImage", "Upload Image")}
                </StyledText>
                <Feather name="upload" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Video Upload */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="video" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTouchableOpacity
                onPress={pickVideo}
                disabled={uploading}
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
              >
                <StyledText className="text-white/70">
                  {uploading
                    ? t("uploading", "Uploading...")
                    : techniqueData.video_url
                    ? t("videoUploaded", "Video uploaded")
                    : t("uploadVideo", "Upload Video")}
                </StyledText>
                <Feather name="upload" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Additional Information Section */}
        <StyledView className="mb-6">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("additionalInformation", "Additional Information")}
          </StyledText>

          {/* Notes */}
          <StyledView className="flex-row mb-4">
            <StyledView className="w-12 h-19 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
              <Feather name="edit" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTextInput
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] min-h-[80px]"
                placeholder={t("notes", "Additional notes (optional)")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={techniqueData.notes}
                onChangeText={(text) => updateTechniqueData({ notes: text })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </StyledView>
          </StyledView>

          {/* Special Materials */}
          <StyledView className="flex-row mb-4">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <MaterialCommunityIcons name="toolbox" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledText className="text-white mb-2 ml-1">
                {t("specialMaterials", "Special Materials")}
              </StyledText>
              
              {/* List of special materials */}
              {techniqueData.special_materials.map((material, index) => (
                <StyledView key={index} className="flex-row items-center bg-[#D4D4D4]/10 rounded-lg p-2 mb-2 border border-[#5bb9a3]">
                  <StyledText className="text-white flex-1">{material}</StyledText>
                  <StyledTouchableOpacity
                    onPress={() => removeSpecialMaterial(index)}
                    className="ml-2 p-1"
                  >
                    <Feather name="x" size={16} color="white" />
                  </StyledTouchableOpacity>
                </StyledView>
              ))}

              {/* Add material button */}
              <StyledTouchableOpacity
                onPress={addSpecialMaterial}
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-center"
              >
                <Feather name="plus" size={20} color="white" />
                <StyledText className="text-white/70 ml-2">
                  {t("addMaterial", "Add Material")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Price (if public) */}
          <StyledView className="flex-row mb-4">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="dollar-sign" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTextInput
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3]"
                placeholder={t("price", "Price (optional)")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={techniqueData.price?.toString() || ""}
                onChangeText={(text) => {
                  const numericValue = parseFloat(text) || null;
                  updateTechniqueData({ price: numericValue });
                }}
                keyboardType="numeric"
              />
            </StyledView>
          </StyledView>

          {/* Public Switch */}
          <StyledView className="flex-row items-center mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="globe" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1 flex-row items-center justify-between">
              <StyledText className="text-white">
                {t("makePublic", "Make this technique public")}
              </StyledText>
              <StyledSwitch
                value={techniqueData.is_public}
                onValueChange={(value) => updateTechniqueData({ is_public: value })}
                trackColor={{ false: "#767577", true: "#10b981" }}
                thumbColor={techniqueData.is_public ? "#ffffff" : "#f4f3f4"}
              />
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Step indicator */}
        <StyledText className="text-center text-white/60 mb-4">
          {`${currentStep} of ${totalSteps}`}
        </StyledText>

        {/* Create Technique Button */}
        <StyledTouchableOpacity
          className={`w-full py-4 rounded-lg items-center justify-center flex-row mb-6 ${
            saving || !techniqueData.name.trim() || !techniqueData.description.trim()
              ? "bg-white/10"
              : "bg-emerald-700"
          }`}
          disabled={
            saving || !techniqueData.name.trim() || !techniqueData.description.trim()
          }
          onPress={isLastStep ? handleCreateTechnique : onNext}
        >
          <StyledText className="text-white font-semibold text-base">
            {saving
              ? t("saving", "Saving...")
              : t("createTechnique", "Create Technique")}
          </StyledText>
          {saving && (
            <Ionicons
              name="refresh"
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