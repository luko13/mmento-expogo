// components/add-technique/steps/TechniqueDetailsStepEncrypted.tsx
"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import { useEncryption } from "../../../hooks/useEncryption"
import { FileEncryptionService } from "../../../utils/fileEncryption"
import { supabase } from "../../../lib/supabase"
import { type EncryptedTechnique } from "../../../types/encryptedTechnique"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledScrollView = styled(ScrollView)
const StyledSwitch = styled(Switch)

interface StepProps {
  techniqueData: EncryptedTechnique
  updateTechniqueData: (data: Partial<EncryptedTechnique>) => void
  onNext?: () => void
  onCancel?: () => void
  currentStep?: number
  totalSteps?: number
  isSubmitting?: boolean
  isNextButtonDisabled?: boolean
  isLastStep?: boolean
}

export default function TechniqueDetailsStepEncrypted({
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
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [uploadingType, setUploadingType] = useState<'image' | 'video' | null>(null)
  const insets = useSafeAreaInsets()
  
  // Hooks de cifrado
  const {
    isReady: encryptionReady,
    keyPair,
    getPublicKey,
    error: encryptionError
  } = useEncryption()

  const fileEncryptionService = new FileEncryptionService()

  // Opciones de selección de ángulos
  const angles = [
    { value: "90", label: "90°" },
    { value: "120", label: "120°" },
    { value: "180", label: "180°" },
    { value: "360", label: "360°" },
  ]

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

  // Función para solicitar permisos
  const requestMediaLibraryPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert(
          t("security.permissionRequired", "Permiso Requerido"),
          t("security.mediaLibraryPermission", "Necesitamos acceso a tu biblioteca de medios para subir archivos cifrados."),
          [{ text: t("ok", "OK") }]
        )
        return false
      }
      return true
    } catch (error) {
      console.error("Error solicitando permisos:", error)
      return false
    }
  }

  // Seleccionar ángulo
  const selectAngle = (angle: string): void => {
    const updatedAngles = techniqueData.angles.includes(angle)
      ? techniqueData.angles.filter((a) => a !== angle)
      : [...techniqueData.angles, angle]

    updateTechniqueData({ angles: updatedAngles })
  }

  // Función para seleccionar y cifrar imagen
  const pickAndEncryptImage = async () => {
    try {
      if (!encryptionReady || !keyPair) {
        Alert.alert(
          t('security.error', 'Error de Seguridad'),
          t('security.encryptionNotReady', 'El sistema de cifrado no está listo')
        )
        return
      }

      const hasPermission = await requestMediaLibraryPermissions()
      if (!hasPermission) return

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3] as [number, number],
      }

      const result = await ImagePicker.launchImageLibraryAsync(options)

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri

        // Verificar tamaño del archivo
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri)

          if (fileInfo.exists && "size" in fileInfo) {
            if (fileInfo.size > 10 * 1024 * 1024) { // 10MB
              Alert.alert(
                t("security.fileTooLarge", "Archivo Muy Grande"),
                t("security.imageSizeWarning", "La imagen seleccionada es muy grande. Por favor selecciona una imagen más pequeña."),
                [{ text: t("ok", "OK") }]
              )
              return
            }
          }
        } catch (error) {
          console.error("Error verificando tamaño de archivo:", error)
        }

        await encryptAndStoreImage(uri)
      }
    } catch (error) {
      console.error("Error seleccionando imagen:", error)
      Alert.alert(
        t("error", "Error"),
        t("security.imagePickError", "Hubo un error seleccionando la imagen. Inténtalo de nuevo."),
        [{ text: t("ok", "OK") }]
      )
    }
  }

  // Función para seleccionar y cifrar video
  const pickAndEncryptVideo = async () => {
    try {
      if (!encryptionReady || !keyPair) {
        Alert.alert(
          t('security.error', 'Error de Seguridad'),
          t('security.encryptionNotReady', 'El sistema de cifrado no está listo')
        )
        return
      }

      const hasPermission = await requestMediaLibraryPermissions()
      if (!hasPermission) return

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.7,
        videoMaxDuration: 60, // 1 minuto máximo
      }

      const result = await ImagePicker.launchImageLibraryAsync(options)

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri

        // Verificar tamaño del archivo
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri)

          if (fileInfo.exists && "size" in fileInfo) {
            if (fileInfo.size > 50 * 1024 * 1024) { // 50MB
              Alert.alert(
                t("security.fileTooLarge", "Archivo Muy Grande"),
                t("security.videoSizeWarning", "El video seleccionado es muy grande. Por favor selecciona un video más pequeño o recórtalo."),
                [{ text: t("ok", "OK") }]
              )
              return
            }
          }
        } catch (error) {
          console.error("Error verificando tamaño de archivo:", error)
        }

        await encryptAndStoreVideo(uri)
      }
    } catch (error) {
      console.error("Error seleccionando video:", error)
      Alert.alert(
        t("error", "Error"),
        t("security.videoPickError", "Hubo un error seleccionando el video. Inténtalo de nuevo."),
        [{ text: t("ok", "OK") }]
      )
    }
  }

  // Cifrar y almacenar imagen
  const encryptAndStoreImage = async (uri: string) => {
    if (!keyPair) return

    try {
      setUploading(true)
      setUploadingType('image')

      // Obtener información del usuario
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Cifrar y subir imagen
      const metadata = await fileEncryptionService.encryptAndUploadFile(
        uri,
        `technique_image_${Date.now()}.jpg`,
        'image/jpeg',
        user.id,
        [user.id], // Solo el autor tiene acceso
        getPublicKey,
        () => keyPair.privateKey
      )

      // Actualizar los datos de la técnica con el ID del archivo cifrado
      updateTechniqueData({ 
        image_url: metadata.fileId,
        encryptedFiles: {
          ...techniqueData.encryptedFiles,
          image: metadata.fileId
        }
      })

      Alert.alert(
        t('security.success', 'Éxito'),
        t('security.imageEncryptedSuccess', 'Imagen cifrada y almacenada de forma segura'),
        [{ text: t('ok', 'OK') }]
      )

    } catch (error) {
      console.error('Error cifrando imagen:', error)
      Alert.alert(
        t('security.error', 'Error de Cifrado'),
        t('security.imageEncryptionError', 'No se pudo cifrar la imagen. Inténtalo de nuevo.'),
        [{ text: t('ok', 'OK') }]
      )
    } finally {
      setUploading(false)
      setUploadingType(null)
    }
  }

  // Cifrar y almacenar video
  const encryptAndStoreVideo = async (uri: string) => {
    if (!keyPair) return

    try {
      setUploading(true)
      setUploadingType('video')

      // Obtener información del usuario
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Cifrar y subir video
      const metadata = await fileEncryptionService.encryptAndUploadFile(
        uri,
        `technique_video_${Date.now()}.mp4`,
        'video/mp4',
        user.id,
        [user.id], // Solo el autor tiene acceso
        getPublicKey,
        () => keyPair.privateKey
      )

      // Actualizar los datos de la técnica con el ID del archivo cifrado
      updateTechniqueData({ 
        video_url: metadata.fileId,
        encryptedFiles: {
          ...techniqueData.encryptedFiles,
          video: metadata.fileId
        }
      })

      Alert.alert(
        t('security.success', 'Éxito'),
        t('security.videoEncryptedSuccess', 'Video cifrado y almacenado de forma segura'),
        [{ text: t('ok', 'OK') }]
      )

    } catch (error) {
      console.error('Error cifrando video:', error)
      Alert.alert(
        t('security.error', 'Error de Cifrado'),
        t('security.videoEncryptionError', 'No se pudo cifrar el video. Inténtalo de nuevo.'),
        [{ text: t('ok', 'OK') }]
      )
    } finally {
      setUploading(false)
      setUploadingType(null)
    }
  }

  // Función para agregar material especial
  const addSpecialMaterial = () => {
    Alert.prompt(
      t("addSpecialMaterial", "Añadir Material Especial"),
      t("enterMaterialName", "Ingresa el nombre del material especial"),
      [
        {
          text: t("cancel", "Cancelar"),
          style: "cancel",
        },
        {
          text: t("add", "Añadir"),
          onPress: (text) => {
            if (text && text.trim()) {
              const updatedMaterials = [...techniqueData.special_materials, text.trim()]
              updateTechniqueData({ special_materials: updatedMaterials })
            }
          },
        },
      ],
      "plain-text"
    )
  }

  // Función para eliminar material especial
  const removeSpecialMaterial = (index: number) => {
    const updatedMaterials = techniqueData.special_materials.filter((_, i) => i !== index)
    updateTechniqueData({ special_materials: updatedMaterials })
  }

  // Obtener fecha actual formateada
  const getCurrentDate = () => {
    const now = new Date()
    const day = now.getDate().toString().padStart(2, "0")
    const month = (now.getMonth() + 1).toString().padStart(2, "0")
    const year = now.getFullYear()
    return `${day}/${month}/${year}`
  }

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
      <StyledView className="flex-row items-center justify-between px-6 pt-4">
        <StyledTouchableOpacity className="p-2" onPress={onCancel}>
          <Feather name="chevron-left" size={24} color="white" />
        </StyledTouchableOpacity>
        
        <StyledView className="flex-1 items-center">
          <StyledText className="text-white text-lg font-semibold">
            {techniqueData.name || t("techniqueTitle", "Técnica")}
          </StyledText>
          <StyledText className="text-emerald-200 text-sm opacity-70">
            {getCurrentDate()}
          </StyledText>
        </StyledView>
        
        <StyledTouchableOpacity className="p-2">
          <MaterialIcons name="security" size={24} color="#10b981" />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1 px-6 mt-6">
        {/* Aviso de cifrado */}
        <StyledView className="bg-emerald-500/20 rounded-lg p-4 mb-6 border border-emerald-500/30">
          <StyledView className="flex-row items-center mb-2">
            <MaterialIcons name="security" size={20} color="#10b981" />
            <StyledText className="text-emerald-200 font-semibold ml-3">
              {t("security.protectedMedia", "Multimedia Protegida")}
            </StyledText>
          </StyledView>
          <StyledText className="text-emerald-200/80 text-sm">
            {t("security.mediaEncryptionNotice", "Todos los archivos multimedia serán cifrados de extremo a extremo antes de ser almacenados.")}
          </StyledText>
        </StyledView>

        {/* Statistics Section */}
        <StyledView className="mb-6">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("statistics", "Estadísticas")}
          </StyledText>

          {/* Angles Selection */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="rotate-cw" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledText className="text-white mb-2 ml-1">
                {t("angles", "Ángulos")}
              </StyledText>
              <StyledView className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row flex-wrap">
                {angles.map((angle) => (
                  <StyledTouchableOpacity
                    key={angle.value}
                    onPress={() => selectAngle(angle.value)}
                    className="flex-row items-center mr-4 mb-2"
                  >
                    <StyledView
                      className={`w-5 h-5 rounded-full border ${
                        techniqueData.angles.includes(angle.value)
                          ? "border-emerald-400 bg-emerald-400"
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

        {/* Encrypted Media Section */}
        <StyledView className="mb-6">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("security.encryptedMedia", "Multimedia Cifrada")}
          </StyledText>

          {/* Encrypted Image Upload */}
          <StyledView className="flex-row mb-4">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <MaterialIcons name="photo-camera" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTouchableOpacity
                onPress={pickAndEncryptImage}
                disabled={uploading || !encryptionReady}
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
              >
                <StyledView className="flex-1 flex-row items-center">
                  {uploading && uploadingType === 'image' ? (
                    <>
                      <ActivityIndicator size="small" color="#10b981" />
                      <StyledText className="text-white/70 ml-2">
                        {t("security.encryptingImage", "Cifrando imagen...")}
                      </StyledText>
                    </>
                  ) : (
                    <>
                      <StyledText className="text-white/70 flex-1">
                        {techniqueData.encryptedFiles?.image
                          ? t("security.imageEncrypted", "Imagen cifrada ✓")
                          : t("security.uploadEncryptedImage", "Subir Imagen Cifrada")}
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

          {/* Encrypted Video Upload */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <MaterialIcons name="videocam" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTouchableOpacity
                onPress={pickAndEncryptVideo}
                disabled={uploading || !encryptionReady}
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
              >
                <StyledView className="flex-1 flex-row items-center">
                  {uploading && uploadingType === 'video' ? (
                    <>
                      <ActivityIndicator size="small" color="#10b981" />
                      <StyledText className="text-white/70 ml-2">
                        {t("security.encryptingVideo", "Cifrando video...")}
                      </StyledText>
                    </>
                  ) : (
                    <>
                      <StyledText className="text-white/70 flex-1">
                        {techniqueData.encryptedFiles?.video
                          ? t("security.videoEncrypted", "Video cifrado ✓")
                          : t("security.uploadEncryptedVideo", "Subir Video Cifrado")}
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
        </StyledView>

        {/* Additional Information Section */}
        <StyledView className="mb-6">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("additionalInformation", "Información Adicional")}
          </StyledText>

          {/* Encrypted Notes */}
          <StyledView className="flex-row mb-4">
            <StyledView className="w-12 h-19 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
              <MaterialIcons name="edit-note" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledView className="flex-row items-center mb-2">
                <StyledText className="text-white flex-1 ml-1">
                  {t("security.encryptedNotes", "Notas Cifradas")}
                </StyledText>
                <MaterialIcons name="security" size={16} color="#10b981" />
              </StyledView>
              <StyledTextInput
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] min-h-[100px]"
                placeholder={t("security.notesPlaceholder", "Notas adicionales (cifradas automáticamente)")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={techniqueData.notes}
                onChangeText={(text) => updateTechniqueData({ notes: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </StyledView>
          </StyledView>

          {/* Encrypted Special Materials */}
          <StyledView className="flex-row mb-4">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <MaterialCommunityIcons name="toolbox" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledView className="flex-row items-center mb-2">
                <StyledText className="text-white flex-1 ml-1">
                  {t("security.encryptedMaterials", "Materiales Especiales Cifrados")}
                </StyledText>
                <MaterialIcons name="security" size={16} color="#10b981" />
              </StyledView>
              
              {/* Lista de materiales especiales */}
              {techniqueData.special_materials.map((material, index) => (
                <StyledView key={index} className="flex-row items-center bg-[#D4D4D4]/10 rounded-lg p-3 mb-2 border border-[#5bb9a3]">
                  <MaterialIcons name="security" size={16} color="#10b981" />
                  <StyledText className="text-white flex-1 ml-2">{material}</StyledText>
                  <StyledTouchableOpacity
                    onPress={() => removeSpecialMaterial(index)}
                    className="ml-2 p-1"
                  >
                    <Feather name="x" size={16} color="white" />
                  </StyledTouchableOpacity>
                </StyledView>
              ))}

              {/* Botón para agregar material */}
              <StyledTouchableOpacity
                onPress={addSpecialMaterial}
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-center"
              >
                <Feather name="plus" size={20} color="white" />
                <StyledText className="text-white/70 ml-2">
                  {t("security.addEncryptedMaterial", "Añadir Material Cifrado")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Price */}
          <StyledView className="flex-row mb-4">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="dollar-sign" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTextInput
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3]"
                placeholder={t("price", "Precio (opcional)")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={techniqueData.price?.toString() || ""}
                onChangeText={(text) => {
                  const numericValue = parseFloat(text) || null
                  updateTechniqueData({ price: numericValue })
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
              <StyledView className="flex-1">
                <StyledText className="text-white">
                  {t("security.makePublic", "Hacer pública esta técnica")}
                </StyledText>
                <StyledText className="text-white/60 text-xs">
                  {t("security.publicWarning", "Solo los metadatos serán públicos, el contenido permanece cifrado")}
                </StyledText>
              </StyledView>
              <StyledSwitch
                value={techniqueData.is_public}
                onValueChange={(value) => updateTechniqueData({ is_public: value })}
                trackColor={{ false: "#767577", true: "#10b981" }}
                thumbColor={techniqueData.is_public ? "#ffffff" : "#f4f3f4"}
              />
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Security Information */}
        <StyledView className="bg-slate-800/30 rounded-lg p-4 mb-6 border border-slate-600/30">
          <StyledView className="flex-row items-center mb-3">
            <MaterialIcons name="info" size={20} color="#10b981" />
            <StyledText className="text-white font-semibold ml-3">
              {t("security.encryptionInfo", "Información de Cifrado")}
            </StyledText>
          </StyledView>
          <StyledText className="text-white/70 text-sm leading-5">
            {t("security.encryptionExplanation", "Todos los datos sensibles (nombre, descripción, notas, materiales y archivos multimedia) son cifrados de extremo a extremo antes de ser almacenados. Solo tú tienes acceso a la clave de descifrado.")}
          </StyledText>
        </StyledView>
      </StyledScrollView>

      {/* Bottom Section */}
      <StyledView className="px-6" style={{ paddingBottom: insets.bottom + 20 }}>
        {/* Step indicator */}
        <StyledText className="text-white/60 text-center text-sm mb-6">
          {t("navigation.stepIndicator", { current: currentStep, total: totalSteps })}
        </StyledText>

        {/* Create Technique Button */}
        <StyledTouchableOpacity
          className={`w-full h-12 rounded-xl items-center justify-center flex-row ${
            !isSubmitting && !uploading && encryptionReady
              ? 'bg-emerald-700'
              : 'bg-white/10'
          }`}
          disabled={isSubmitting || uploading || !encryptionReady}
          onPress={onNext}
        >
          {isSubmitting || uploading ? (
            <>
              <ActivityIndicator size="small" color="white" />
              <StyledText className="text-white font-semibold text-base ml-2">
                {uploading 
                  ? t("security.encrypting", "Cifrando...")
                  : t("actions.saving", "Guardando...")
                }
              </StyledText>
            </>
          ) : (
            <>
              <MaterialIcons name="security" size={20} color="white" />
              <StyledText className="text-white font-semibold text-base ml-2">
                {t("security.createEncryptedTechnique", "Crear Técnica Cifrada")}
              </StyledText>
            </>
          )}
        </StyledTouchableOpacity>
      </StyledView>
    </StyledView>
  )
}