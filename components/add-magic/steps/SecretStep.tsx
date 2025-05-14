"use client"

import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, Alert, Platform } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, AntDesign } from "@expo/vector-icons"
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

export default function SecretStep({ trickData, updateTrickData }: StepProps) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [newMaterial, setNewMaterial] = useState("")

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
          console.log("File info:", fileInfo)

          // Verificar si el archivo existe y tiene tamaño
          if (fileInfo.exists && "size" in fileInfo) {
            console.log("File size:", fileInfo.size)

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
      const filePath = `secret_videos/${Date.now()}.${fileExt}`

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
          updateTrickData({ secret_video_url: publicURL.publicUrl })
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

  // Añadir material especial
  const addMaterial = () => {
    if (!newMaterial.trim()) return

    const updatedMaterials = [...trickData.special_materials, newMaterial.trim()]
    updateTrickData({ special_materials: updatedMaterials })
    setNewMaterial("")
  }

  // Eliminar material
  const removeMaterial = (index: number) => {
    const updatedMaterials = [...trickData.special_materials]
    updatedMaterials.splice(index, 1)
    updateTrickData({ special_materials: updatedMaterials })
  }

  return (
    <StyledView className="flex-1">
      {/* Descripción del secreto */}
      <StyledView className="mb-6">
        <StyledText className="text-white text-lg mb-2">{t("secretDescription", "Secret Description")}*</StyledText>
        <StyledView className="overflow-hidden rounded-lg">
          <BlurView intensity={20} tint="dark">
            <StyledTextInput
              className="text-white p-3"
              placeholder={t("describeSecret", "Describe how the trick works...")}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={trickData.secret}
              onChangeText={(text) => updateTrickData({ secret: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </BlurView>
        </StyledView>
      </StyledView>

      {/* Video del secreto */}
      <StyledView className="mb-6">
        <StyledText className="text-white text-lg mb-2">{t("secretVideo", "Secret Video")}</StyledText>

        {trickData.secret_video_url ? (
          <StyledView className="bg-white/10 rounded-lg p-2">
            <StyledText className="text-white mb-2">{t("videoUploaded", "Video uploaded successfully")}</StyledText>
            <StyledTouchableOpacity
              onPress={() => updateTrickData({ secret_video_url: null })}
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
              {uploading ? t("uploading", "Uploading...") : t("uploadSecretVideo", "Upload Secret Video")}
            </StyledText>
          </StyledTouchableOpacity>
        )}
      </StyledView>

      {/* Materiales especiales */}
      <StyledView className="mb-6">
        <StyledText className="text-white text-lg mb-2">{t("specialMaterials", "Special Materials")}</StyledText>

        {/* Añadir nuevo material */}
        <StyledView className="flex-row mb-3">
          <StyledView className="flex-1 overflow-hidden rounded-lg mr-2">
            <BlurView intensity={20} tint="dark">
              <StyledTextInput
                className="text-white p-3"
                placeholder={t("addMaterial", "Add material")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={newMaterial}
                onChangeText={setNewMaterial}
                onSubmitEditing={addMaterial}
              />
            </BlurView>
          </StyledView>
          <StyledTouchableOpacity onPress={addMaterial} className="bg-emerald-700 p-3 rounded-lg">
            <AntDesign name="plus" size={24} color="white" />
          </StyledTouchableOpacity>
        </StyledView>

        {/* Lista de materiales */}
        {trickData.special_materials.length > 0 && (
          <StyledView className="bg-white/10 rounded-lg p-3">
            <StyledText className="text-white mb-2">{t("materialsList", "Materials List")}:</StyledText>

            {trickData.special_materials.map((material, index) => (
              <StyledView key={index} className="flex-row items-center justify-between bg-white/10 mb-2 p-3 rounded-lg">
                <StyledText className="text-white flex-1">{material}</StyledText>
                <StyledTouchableOpacity onPress={() => removeMaterial(index)}>
                  <Feather name="x" size={20} color="white" />
                </StyledTouchableOpacity>
              </StyledView>
            ))}
          </StyledView>
        )}
      </StyledView>
    </StyledView>
  )
}
