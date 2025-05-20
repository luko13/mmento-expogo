"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, Alert, Platform, ScrollView } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, Ionicons, FontAwesome5 } from "@expo/vector-icons"
import type { MagicTrick } from "../AddMagicWizard"
import * as ImagePicker from "expo-image-picker"
import { supabase } from "../../../lib/supabase"
import * as FileSystem from "expo-file-system"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from "expo-router"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledScrollView = styled(ScrollView)

interface StepProps {
  trickData: MagicTrick
  updateTrickData: (data: Partial<MagicTrick>) => void
  onNext?: () => void
  onCancel?: () => void
  currentStep?: number
  totalSteps?: number
  isSubmitting?: boolean
  isNextButtonDisabled?: boolean
  isLastStep?: boolean
}

export default function EffectStep({
  trickData,
  updateTrickData,
  onNext,
  onCancel,
  currentStep = 1,
  totalSteps = 2,
  isSubmitting = false,
  isNextButtonDisabled = false,
  isLastStep = false
}: StepProps) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const insets = useSafeAreaInsets()
  const router = useRouter()

  // Request permissions
  const requestMediaLibraryPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert(
          t("permissionRequired", "Permission Required"),
          t("mediaLibraryPermission", "We need access to your media library to upload videos."),
          [{ text: t("ok", "OK") }],
        )
        return false
      }
      return true
    } catch (error) {
      console.error("Error requesting permissions:", error)
      return false
    }
  }

  // Upload effect video
  const pickEffectVideo = async () => {
    try {
      // Request permissions first
      const hasPermission = await requestMediaLibraryPermissions()
      if (!hasPermission) return

      // Configure options to reduce video size
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.5,
        videoMaxDuration: 60,
      }

      const result = await ImagePicker.launchImageLibraryAsync(options)

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri

        // Check file size
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri)
          
          // Check if file exists and has size
          if (fileInfo.exists && "size" in fileInfo) {
            // If file is larger than 50MB, show warning
            if (fileInfo.size > 50 * 1024 * 1024) {
              Alert.alert(
                t("fileTooLarge", "File Too Large"),
                t(
                  "fileSizeWarning",
                  "The selected video is too large. Please select a smaller video or trim this one.",
                ),
                [{ text: t("ok", "OK") }],
              )
              return
            }
          }
        } catch (error) {
          console.error("Error checking file size:", error)
        }

        await uploadEffectVideo(uri)
      }
    } catch (error) {
      console.error("Error picking video:", error)
      Alert.alert(
        t("error", "Error"),
        t("videoPickError", "There was an error selecting the video. Please try again."),
        [{ text: t("ok", "OK") }],
      )
    }
  }

  // Upload secret video
  const pickSecretVideo = async () => {
    try {
      // Request permissions first
      const hasPermission = await requestMediaLibraryPermissions()
      if (!hasPermission) return

      // Configure options to reduce video size
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.5,
        videoMaxDuration: 60,
      }

      const result = await ImagePicker.launchImageLibraryAsync(options)

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri

        // Check file size
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri)
          
          // Check if file exists and has size
          if (fileInfo.exists && "size" in fileInfo) {
            // If file is larger than 50MB, show warning
            if (fileInfo.size > 50 * 1024 * 1024) {
              Alert.alert(
                t("fileTooLarge", "File Too Large"),
                t(
                  "fileSizeWarning",
                  "The selected video is too large. Please select a smaller video or trim this one.",
                ),
                [{ text: t("ok", "OK") }],
              )
              return
            }
          }
        } catch (error) {
          console.error("Error checking file size:", error)
        }

        await uploadSecretVideo(uri)
      }
    } catch (error) {
      console.error("Error picking video:", error)
      Alert.alert(
        t("error", "Error"),
        t("videoPickError", "There was an error selecting the video. Please try again."),
        [{ text: t("ok", "OK") }],
      )
    }
  }

  // Upload effect video to Supabase Storage
  const uploadEffectVideo = async (uri: string) => {
    try {
      setUploading(true)

      // Get file name
      const fileName = uri.split("/").pop() || ""
      const fileExt = fileName.split(".").pop()?.toLowerCase() || "mp4"
      const filePath = `effect_videos/${Date.now()}.${fileExt}`

      // On iOS, use FileSystem to read the file instead of fetch/blob
      if (Platform.OS === "ios") {
        try {
          const fileContent = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          })

          const { data, error } = await supabase.storage.from("magic_trick_media").upload(filePath, fileContent, {
            contentType: `video/${fileExt}`,
            upsert: true,
          })

          if (error) {
            console.error("Error uploading video:", error)
            Alert.alert(t("uploadError", "Upload Error"), error.message)
            return
          }

          // Get public URL
          const { data: publicURL } = supabase.storage.from("magic_trick_media").getPublicUrl(filePath)

          // Update trick data
          updateTrickData({ effect_video_url: publicURL.publicUrl })
        } catch (error) {
          console.error("Error reading file:", error)
          Alert.alert(
            t("fileReadError", "File Read Error"),
            t("couldNotReadFile", "Could not read the video file. Please try again with a different video."),
          )
        }
      } else {
        // For Android, continue using the previous method
        const response = await fetch(uri)
        const blob = await response.blob()

        const { data, error } = await supabase.storage.from("magic_trick_media").upload(filePath, blob)

        if (error) {
          console.error("Error uploading video:", error)
          Alert.alert(t("uploadError", "Upload Error"), error.message)
          return
        }

        // Get public URL
        const { data: publicURL } = supabase.storage.from("magic_trick_media").getPublicUrl(filePath)

        // Update trick data
        updateTrickData({ effect_video_url: publicURL.publicUrl })
      }
    } catch (error) {
      console.error("Error in upload process:", error)
      Alert.alert(
        t("uploadError", "Upload Error"),
        t("generalUploadError", "There was an error uploading the video. Please try again."),
      )
    } finally {
      setUploading(false)
    }
  }

  // Upload secret video to Supabase Storage
  const uploadSecretVideo = async (uri: string) => {
    try {
      setUploading(true)

      // Get file name
      const fileName = uri.split("/").pop() || ""
      const fileExt = fileName.split(".").pop()?.toLowerCase() || "mp4"
      const filePath = `secret_videos/${Date.now()}.${fileExt}`

      // On iOS, use FileSystem to read the file instead of fetch/blob
      if (Platform.OS === "ios") {
        try {
          const fileContent = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          })

          const { data, error } = await supabase.storage.from("magic_trick_media").upload(filePath, fileContent, {
            contentType: `video/${fileExt}`,
            upsert: true,
          })

          if (error) {
            console.error("Error uploading video:", error)
            Alert.alert(t("uploadError", "Upload Error"), error.message)
            return
          }

          // Get public URL
          const { data: publicURL } = supabase.storage.from("magic_trick_media").getPublicUrl(filePath)

          // Update trick data
          updateTrickData({ secret_video_url: publicURL.publicUrl })
        } catch (error) {
          console.error("Error reading file:", error)
          Alert.alert(
            t("fileReadError", "File Read Error"),
            t("couldNotReadFile", "Could not read the video file. Please try again with a different video."),
          )
        }
      } else {
        // For Android, continue using the previous method
        const response = await fetch(uri)
        const blob = await response.blob()

        const { data, error } = await supabase.storage.from("magic_trick_media").upload(filePath, blob)

        if (error) {
          console.error("Error uploading video:", error)
          Alert.alert(t("uploadError", "Upload Error"), error.message)
          return
        }

        // Get public URL
        const { data: publicURL } = supabase.storage.from("magic_trick_media").getPublicUrl(filePath)

        // Update trick data
        updateTrickData({ secret_video_url: publicURL.publicUrl })
      }
    } catch (error) {
      console.error("Error in upload process:", error)
      Alert.alert(
        t("uploadError", "Upload Error"),
        t("generalUploadError", "There was an error uploading the video. Please try again."),
      )
    } finally {
      setUploading(false)
    }
  }

  // Esta función maneja la navegación hacia ExtrasStep
  const goToExtrasStep = () => {
    if (onNext) {
      onNext()
    }
  }
  
  // Función para guardar el truco directamente
  const handleRegisterMagic = async () => {
    try {
      setSaving(true)
      
      // Validar que los campos necesarios estén completos
      if (!trickData.effect?.trim() || !trickData.secret?.trim()) {
        Alert.alert(
          t("validationError", "Error de Validación"),
          t("requiredFieldsMissing", "Por favor complete todos los campos obligatorios."),
          [{ text: t("ok", "OK") }]
        )
        return
      }
      
      // Obtener el usuario actual
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error("No user found")
        Alert.alert(t("error"), t("userNotFound", "Usuario no encontrado"))
        return
      }

      // Verificar si el usuario ya tiene un perfil
      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single()

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error checking profile:", profileError)
        throw new Error("Error checking user profile")
      }

      // Si el perfil no existe, crearlo
      if (!existingProfile) {
        const username = user.email?.split("@")[0] || ""

        const { error: insertError } = await supabase.from("profiles").insert({
          id: user.id,
          email: user.email || "",
          username: username,
          is_active: true,
          is_verified: false,
          subscription_type: "free",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (insertError) {
          console.error("Error creating profile:", insertError)
          throw new Error("Could not create user profile")
        }
      }

      // Insertar el truco en la base de datos
      const { data, error } = await supabase
        .from("magic_tricks")
        .insert({
          user_id: user.id,
          title: trickData.title.trim(),
          effect: trickData.effect.trim(),
          secret: trickData.secret.trim(),
          difficulty: trickData.difficulty,
          duration: trickData.duration,
          reset: trickData.reset,
          angles: trickData.angles.length > 0 ? JSON.stringify(trickData.angles) : null,
          notes: trickData.notes?.trim() || "",
          special_materials: trickData.special_materials,
          effect_video_url: trickData.effect_video_url,
          secret_video_url: trickData.secret_video_url,
          photo_url: trickData.photo_url,
          status: "draft",
        })
        .select("id")
        .single()

      if (error) {
        console.error("Error creating trick:", error)
        Alert.alert(t("error"), t("errorCreatingTrick", "Error creando el truco"))
        return
      }

      // Asociar categoría si está seleccionada
      if (trickData.selectedCategoryId) {
        try {
          const { error: categoryError } = await supabase.from("trick_categories").insert({
            trick_id: data.id,
            category_id: trickData.selectedCategoryId,
            created_at: new Date().toISOString(),
          })

          if (categoryError) {
            console.error("Error associating category with trick:", categoryError)
          }
        } catch (categoryError) {
          console.error("Error in category association:", categoryError)
        }
      }

      // Asociar etiquetas
      if (trickData.tags.length > 0) {
        try {
          const tagInserts = trickData.tags.map(tagId => ({
            trick_id: data.id,
            tag_id: tagId,
            created_at: new Date().toISOString(),
          }))

          const { error: tagError } = await supabase
            .from("trick_tags")
            .insert(tagInserts)

          if (tagError && tagError.code !== "23505") {
            console.error("Error associating tags with trick:", tagError)
          }
        } catch (tagError) {
          console.error("Error in tag association:", tagError)
        }
      }

      // Mensaje de éxito
      Alert.alert(
        t("success", "Éxito"),
        t("trickCreatedSuccessfully", "El truco ha sido creado exitosamente"),
        [{ text: t("ok", "OK") }]
      )

      // Navegar a la pantalla principal
      router.replace("/(app)/home")
      
    } catch (error) {
      console.error("Error saving trick:", error)
      Alert.alert(
        t("error", "Error"),
        t("unexpectedError", "Ocurrió un error inesperado"),
        [{ text: t("ok", "OK") }]
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <StyledView className="flex-1">
      {/* Background gradient */}
      <LinearGradient
        colors={['#064e3b', '#065f46']} 
        style={{ 
          position: 'absolute',
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
            {t("content", "Content")}
          </StyledText>
        </StyledView>
        
        <StyledTouchableOpacity className="p-2">
          <Feather name="info" size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1 px-6">
        {/* Effect Section */}
        <StyledView className="mt-6 mb-6">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("effect", "Effect")}
          </StyledText>
          
          {/* Effect Video */}
          <StyledView className="flex-row mb-4">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="video" size={24} color="white" />
            </StyledView>
            
            <StyledView className="flex-1">
              <StyledTouchableOpacity 
                onPress={pickEffectVideo}
                disabled={uploading}
                className=" text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
              >
                <StyledText className="text-white/70">
                  {uploading ? 
                    t("uploading", "Uploading...") : 
                    trickData.effect_video_url ? 
                      t("videoUploaded", "Video uploaded") : 
                      t("uploadEffectVideo", "Effect video Upload*")
                  }
                </StyledText>
                <Feather name="upload" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
          
          {/* Effect Description */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-19 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
              <Feather name="star" size={24} color="white" />
            </StyledView>
            
            <StyledView className="flex-1">
              <StyledTextInput
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] min-h-[80px]"
                placeholder={t("effectShortDescription", "Effect short description")}
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
            {t("secret", "Secret")}
          </StyledText>
          
          {/* Secret Video */}
          <StyledView className="flex-row mb-4">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="video" size={24} color="white" />
            </StyledView>
            
            <StyledView className="flex-1 ml-3">
              <StyledTouchableOpacity 
                onPress={pickSecretVideo}
                disabled={uploading}
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
              >
                <StyledText className="text-white/70">
                  {uploading ? 
                    t("uploading", "Uploading...") : 
                    trickData.secret_video_url ? 
                      t("videoUploaded", "Video uploaded") : 
                      t("secretVideoUpload", "Secret video Upload")
                  }
                </StyledText>
                <Feather name="upload" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
          
          {/* Secret Description */}
          <StyledView className="flex-row mb-28">
            <StyledView className="w-12 h-19 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
              <Feather name="lock" size={24} color="white" />
            </StyledView>
            
            <StyledView className="flex-1 ml-3">
              <StyledTextInput
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] min-h-[80px]"
                placeholder={t("effectSecretDescription", "Effect secret description")}
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
          {`${currentStep} of ${totalSteps}`}
        </StyledText>
        
        {/* Statistics Button (Navigate to ExtrasStep) */}
        <StyledTouchableOpacity
          className="w-full py-4 rounded-lg items-center justify-center flex-row border border-[#2C6B5C] bg-transparent mb-4"
          onPress={goToExtrasStep}
        >
          <StyledText className="text-white font-semibold text-base">
            {t("statistics", "Statistics")}
          </StyledText>
          <StyledText className="text-white/60 text-base ml-1">
            {t("optional", "(Optional)")}
          </StyledText>
          <Feather name="chevron-right" size={20} color="white" style={{ position: 'absolute', right: 16 }} />
        </StyledTouchableOpacity>
        
        {/* Register Magic Button */}
        <StyledTouchableOpacity
          className={`w-full py-4 rounded-lg items-center justify-center flex-row mb-6 ${
            saving || !trickData.effect.trim() || !trickData.secret.trim() 
              ? 'bg-white/10' 
              : 'bg-emerald-700'
          }`}
          disabled={saving || !trickData.effect.trim() || !trickData.secret.trim()}
          onPress={handleRegisterMagic}
        >
          <StyledText className="text-white font-semibold text-base">
            {saving ? t("saving", "Saving...") : t("registerMagic", "Register Magic")}
          </StyledText>
          {saving && (
            <Ionicons name="refresh" size={20} color="white" style={{ marginLeft: 8 }} />
          )}
        </StyledTouchableOpacity>
      </StyledScrollView>
    </StyledView>
  )
}