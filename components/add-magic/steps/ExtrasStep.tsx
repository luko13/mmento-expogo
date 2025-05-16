"use client"

import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, Image, Alert, Platform } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, FontAwesome } from "@expo/vector-icons"
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

export default function ExtrasStep({ trickData, updateTrickData }: StepProps) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)

  // Solicitar permisos
  const requestMediaLibraryPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert(
          t("permissionRequired", "Permission Required"),
          t("mediaLibraryPermission", "We need access to your media library to upload photos."),
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

  // Seleccionar foto
  const pickImage = async () => {
    try {
      // Solicitar permisos primero
      const hasPermission = await requestMediaLibraryPermissions()
      if (!hasPermission) return

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        aspect: [4, 3] as [number, number], // Especificar como tupla de 2 elementos
      }

      const result = await ImagePicker.launchImageLibraryAsync(options)

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri

        // Verificar tamaño del archivo
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri)
          

          // Verificar si el archivo existe y tiene tamaño
          if (fileInfo.exists && "size" in fileInfo) {
            

            // Si el archivo es mayor a 10MB, mostrar advertencia
            if (fileInfo.size > 10 * 1024 * 1024) {
              Alert.alert(
                t("fileTooLarge", "File Too Large"),
                t("imageSizeWarning", "The selected image is too large. Please select a smaller image."),
                [{ text: t("ok", "OK") }],
              )
              return
            }
          }
        } catch (error) {
          console.error("Error checking file size:", error)
        }

        await uploadImage(uri)
      }
    } catch (error) {
      console.error("Error picking image:", error)
      Alert.alert(
        t("error", "Error"),
        t("imagePickError", "There was an error selecting the image. Please try again."),
        [{ text: t("ok", "OK") }],
      )
    }
  }

  // Subir imagen a Supabase Storage
  const uploadImage = async (uri: string) => {
    try {
      setUploading(true)

      // Obtener el nombre del archivo
      const fileName = uri.split("/").pop() || ""
      const fileExt = fileName.split(".").pop()?.toLowerCase() || "jpg"
      const filePathString = `trick_photos/${Date.now()}.${fileExt}`

      // En iOS, usamos FileSystem para leer el archivo en lugar de fetch/blob
      if (Platform.OS === "ios") {
        try {
          const fileContent = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          })

          const { data, error } = await supabase.storage.from("magic_trick_media").upload(filePathString, fileContent, {
            contentType: `image/${fileExt}`,
            upsert: true,
          })

          if (error) {
            console.error("Error uploading image:", error)
            Alert.alert(t("uploadError", "Upload Error"), error.message)
            return
          }

          // Obtener URL pública
          const { data: publicURL } = supabase.storage.from("magic_trick_media").getPublicUrl(filePathString)

          // Actualizar datos del truco
          updateTrickData({ photo_url: publicURL.publicUrl })
        } catch (error) {
          console.error("Error reading file:", error)
          Alert.alert(
            t("fileReadError", "File Read Error"),
            t("couldNotReadFile", "Could not read the image file. Please try again with a different image."),
          )
        }
      } else {
        // Para Android, seguimos usando el método anterior
        const response = await fetch(uri)
        const blob = await response.blob()

        const { data, error } = await supabase.storage.from("magic_trick_media").upload(filePathString, blob)

        if (error) {
          console.error("Error uploading image:", error)
          Alert.alert(t("uploadError", "Upload Error"), error.message)
          return
        }

        // Obtener URL pública
        const { data: publicURL } = supabase.storage.from("magic_trick_media").getPublicUrl(filePathString)

        // Actualizar datos del truco
        updateTrickData({ photo_url: publicURL.publicUrl })
      }
    } catch (error) {
      console.error("Error in upload process:", error)
      Alert.alert(
        t("uploadError", "Upload Error"),
        t("generalUploadError", "There was an error uploading the image. Please try again."),
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <StyledView className="flex-1">
      {/* Notas adicionales */}
      <StyledView className="mb-6">
        <StyledText className="text-white text-lg mb-2">{t("notes", "Notes")}</StyledText>
        <StyledView className="overflow-hidden rounded-lg">
          <BlurView intensity={20} tint="dark">
            <StyledTextInput
              className="text-white p-3"
              placeholder={t("additionalNotes", "Additional notes, tips, or variations...")}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={trickData.notes}
              onChangeText={(text) => updateTrickData({ notes: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </BlurView>
        </StyledView>
      </StyledView>

      {/* Guión */}
      <StyledView className="mb-6">
        <StyledText className="text-white text-lg mb-2">{t("script", "Script")}</StyledText>
        <StyledView className="overflow-hidden rounded-lg">
          <BlurView intensity={20} tint="dark">
            <StyledView className="flex-row items-center p-2">
              <FontAwesome name="file-text-o" size={20} color="white" />
              <StyledText className="text-white ml-2">
                {t("scriptDescription", "What to say during the performance")}
              </StyledText>
            </StyledView>
            <StyledTextInput
              className="text-white p-3"
              placeholder={t("enterScript", "Enter your performance script...")}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={trickData.script}
              onChangeText={(text) => updateTrickData({ script: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </BlurView>
        </StyledView>
      </StyledView>

      {/* Foto */}
      <StyledView className="mb-6">
        <StyledText className="text-white text-lg mb-2">{t("photo", "Photo")}</StyledText>

        {trickData.photo_url ? (
          <StyledView className="bg-white/10 rounded-lg p-2">
            <Image
              source={{ uri: trickData.photo_url }}
              style={{ width: "100%", height: 200, borderRadius: 8, marginBottom: 8 }}
              resizeMode="cover"
            />
            <StyledTouchableOpacity
              onPress={() => updateTrickData({ photo_url: null })}
              className="bg-red-600 py-2 rounded-lg items-center"
            >
              <StyledText className="text-white">{t("removePhoto", "Remove Photo")}</StyledText>
            </StyledTouchableOpacity>
          </StyledView>
        ) : (
          <StyledTouchableOpacity
            onPress={pickImage}
            disabled={uploading}
            className="bg-emerald-700 p-4 rounded-lg flex-row items-center justify-center"
          >
            <Feather name="camera" size={24} color="white" />
            <StyledText className="text-white ml-2">
              {uploading ? t("uploading", "Uploading...") : t("uploadPhoto", "Upload Photo")}
            </StyledText>
          </StyledTouchableOpacity>
        )}
      </StyledView>

      {/* Mensaje final */}
      <StyledView className="bg-white/10 p-4 rounded-lg mb-6">
        <StyledText className="text-white text-center">
          {t("finalStep", "You're almost done! Review your trick details and click Save to finish.")}
        </StyledText>
      </StyledView>
    </StyledView>
  )
}
