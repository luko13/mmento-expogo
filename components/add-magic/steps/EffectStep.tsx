"use client"

import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, Alert, Platform } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons"
import { BlurView } from "expo-blur"
import type { MagicTrick } from "../AddMagicWizard"
import * as ImagePicker from "expo-image-picker"
import { supabase } from "../../../lib/supabase"
import * as FileSystem from "expo-file-system"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)

interface StepProps {
  trickData: MagicTrick
  updateTrickData: (data: Partial<MagicTrick>) => void
}

export default function EffectStep({ trickData, updateTrickData }: StepProps) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)

  // Dificultades disponibles
  const difficulties = [
    { value: "beginner", label: t("beginner", "Beginner") },
    { value: "easy", label: t("easy", "Easy") },
    { value: "intermediate", label: t("intermediate", "Intermediate") },
    { value: "advanced", label: t("advanced", "Advanced") },
    { value: "expert", label: t("expert", "Expert") },
  ]

  // Ángulos disponibles
  const angles = [
    { value: "front", label: t("front", "Front") },
    { value: "side", label: t("side", "Side") },
    { value: "back", label: t("back", "Back") },
    { value: "above", label: t("above", "Above") },
    { value: "below", label: t("below", "Below") },
  ]

  // Seleccionar dificultad
  const selectDifficulty = (difficulty: string) => {
    updateTrickData({ difficulty })
  }

  // Seleccionar ángulo
  const toggleAngle = (angle: string) => {
    const updatedAngles = trickData.angles.includes(angle)
      ? trickData.angles.filter((a) => a !== angle)
      : [...trickData.angles, angle]

    updateTrickData({ angles: updatedAngles })
  }

  // Solicitar permisos
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

  // Subir video
  const pickVideo = async () => {
    try {
      // Solicitar permisos primero
      const hasPermission = await requestMediaLibraryPermissions()
      if (!hasPermission) return

      // Configurar opciones para reducir el tamaño del video
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.5, // Reducir calidad para archivos más pequeños
        videoMaxDuration: 60, // Limitar duración a 60 segundos
      }

      const result = await ImagePicker.launchImageLibraryAsync(options)

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri

        // Verificar tamaño del archivo
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri)
          

          // Verificar si el archivo existe y tiene tamaño
          if (fileInfo.exists && "size" in fileInfo) {
            

            // Si el archivo es mayor a 50MB, mostrar advertencia
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

        await uploadVideo(uri)
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

  // Subir video a Supabase Storage
  const uploadVideo = async (uri: string) => {
    try {
      setUploading(true)

      // Obtener el nombre del archivo
      const fileName = uri.split("/").pop() || ""
      const fileExt = fileName.split(".").pop()?.toLowerCase() || "mp4"
      const filePath = `effect_videos/${Date.now()}.${fileExt}`

      // En iOS, usamos FileSystem para leer el archivo en lugar de fetch/blob
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

          // Obtener URL pública
          const { data: publicURL } = supabase.storage.from("magic_trick_media").getPublicUrl(filePath)

          // Actualizar datos del truco
          updateTrickData({ effect_video_url: publicURL.publicUrl })
        } catch (error) {
          console.error("Error reading file:", error)
          Alert.alert(
            t("fileReadError", "File Read Error"),
            t("couldNotReadFile", "Could not read the video file. Please try again with a different video."),
          )
        }
      } else {
        // Para Android, seguimos usando el método anterior
        const response = await fetch(uri)
        const blob = await response.blob()

        const { data, error } = await supabase.storage.from("magic_trick_media").upload(filePath, blob)

        if (error) {
          console.error("Error uploading video:", error)
          Alert.alert(t("uploadError", "Upload Error"), error.message)
          return
        }

        // Obtener URL pública
        const { data: publicURL } = supabase.storage.from("magic_trick_media").getPublicUrl(filePath)

        // Actualizar datos del truco
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

  return (
    <StyledView className="flex-1">
      {/* Descripción del efecto */}
      <StyledView className="mb-6">
        <StyledText className="text-white text-lg mb-2">
          {t("effectDescription", "Effect Description")}
          <StyledText className="text-red-400"> *</StyledText>
        </StyledText>
        <StyledView className="overflow-hidden rounded-lg">
          <BlurView intensity={20} tint="dark">
            <StyledTextInput
              className="text-white p-3"
              placeholder={t("describeEffect", "Describe what the audience sees...")}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={trickData.effect}
              onChangeText={(text) => updateTrickData({ effect: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </BlurView>
        </StyledView>
        {!trickData.effect.trim() && (
          <StyledText className="text-red-400 text-sm mt-1">
            {t("effectRequired", "Effect description is required")}
          </StyledText>
        )}
      </StyledView>

      {/* Video del efecto */}
      <StyledView className="mb-6">
        <StyledText className="text-white text-lg mb-2">{t("effectVideo", "Effect Video")}</StyledText>

        {trickData.effect_video_url ? (
          <StyledView className="bg-white/10 rounded-lg p-2">
            <StyledText className="text-white mb-2">{t("videoUploaded", "Video uploaded successfully")}</StyledText>
            <StyledTouchableOpacity
              onPress={() => updateTrickData({ effect_video_url: null })}
              className="bg-red-600 py-2 rounded-lg items-center"
            >
              <StyledText className="text-white">{t("removeVideo", "Remove Video")}</StyledText>
            </StyledTouchableOpacity>
          </StyledView>
        ) : (
          <StyledTouchableOpacity
            onPress={pickVideo}
            disabled={uploading}
            className="bg-emerald-700 p-4 rounded-lg flex-row items-center justify-center"
          >
            <Feather name="video" size={24} color="white" />
            <StyledText className="text-white ml-2">
              {uploading ? t("uploading", "Uploading...") : t("uploadEffectVideo", "Upload Effect Video")}
            </StyledText>
          </StyledTouchableOpacity>
        )}
      </StyledView>

      {/* Ángulos */}
      <StyledView className="mb-6">
        <StyledText className="text-white text-lg mb-2">{t("angles", "Angles")}</StyledText>
        <StyledView className="flex-row flex-wrap">
          {angles.map((angle) => (
            <StyledTouchableOpacity
              key={angle.value}
              onPress={() => toggleAngle(angle.value)}
              className={`m-1 px-3 py-2 rounded-full flex-row items-center ${
                trickData.angles.includes(angle.value) ? "bg-emerald-600" : "bg-white/20"
              }`}
            >
              <StyledText className="text-white">{angle.label}</StyledText>
            </StyledTouchableOpacity>
          ))}
        </StyledView>
      </StyledView>

      {/* Duración */}
      <StyledView className="mb-6">
        <StyledText className="text-white text-lg mb-2">{t("duration", "Duration (seconds)")}</StyledText>
        <StyledView className="flex-row items-center overflow-hidden rounded-lg">
          <BlurView intensity={20} tint="dark" style={{ flex: 1 }}>
            <StyledView className="flex-row items-center p-3">
              <Ionicons name="time" size={20} color="white" />
              <StyledTextInput
                className="text-white ml-2 flex-1"
                placeholder="60"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={trickData.duration?.toString() || ""}
                onChangeText={(text) => {
                  const duration = Number.parseInt(text)
                  if (!isNaN(duration) || text === "") {
                    updateTrickData({ duration: text === "" ? null : duration })
                  }
                }}
                keyboardType="number-pad"
              />
            </StyledView>
          </BlurView>
        </StyledView>
      </StyledView>

      {/* Reset */}
      <StyledView className="mb-6">
        <StyledText className="text-white text-lg mb-2">{t("resetTime", "Reset Time (seconds)")}</StyledText>
        <StyledView className="flex-row items-center overflow-hidden rounded-lg">
          <BlurView intensity={20} tint="dark" style={{ flex: 1 }}>
            <StyledView className="flex-row items-center p-3">
              <Ionicons name="refresh" size={20} color="white" />
              <StyledTextInput
                className="text-white ml-2 flex-1"
                placeholder="30"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={trickData.reset?.toString() || ""}
                onChangeText={(text) => {
                  const reset = Number.parseInt(text)
                  if (!isNaN(reset) || text === "") {
                    updateTrickData({ reset: text === "" ? null : reset })
                  }
                }}
                keyboardType="number-pad"
              />
            </StyledView>
          </BlurView>
        </StyledView>
      </StyledView>

      {/* Dificultad */}
      <StyledView className="mb-6">
        <StyledText className="text-white text-lg mb-2">{t("difficulty", "Difficulty")}</StyledText>
        <StyledView className="flex-row flex-wrap">
          {difficulties.map((difficulty) => (
            <StyledTouchableOpacity
              key={difficulty.value}
              onPress={() => selectDifficulty(difficulty.value)}
              className={`m-1 px-3 py-2 rounded-full flex-row items-center ${
                trickData.difficulty === difficulty.value ? "bg-emerald-600" : "bg-white/20"
              }`}
            >
              <MaterialIcons name="bar-chart" size={16} color="white" />
              <StyledText className="text-white ml-1">{difficulty.label}</StyledText>
            </StyledTouchableOpacity>
          ))}
        </StyledView>
      </StyledView>
    </StyledView>
  )
}
