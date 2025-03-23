"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, Image, Alert, Platform, ActivityIndicator, Linking } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Camera, FileText, ExternalLink } from "lucide-react-native"
import { BlurView } from "expo-blur"
import type { MagicTrick } from "../AddMagicWizard"
import * as ImagePicker from "expo-image-picker"
import { supabase } from "../../../lib/supabase"
import { 
  requestMediaLibraryPermissions, 
  getFileInfo, 
  createPresignedUrl, 
  uploadFileToStorage
} from "../../../utils/mediaUtils"

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
  const [userId, setUserId] = useState<string | null>(null)
  
  // Obtener el ID del usuario al cargar
  useEffect(() => {
    const getUserId = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      }
    };
    
    getUserId();
  }, []);

  // Elegir entre opciones
  const showPhotoOptions = async () => {
    if (!userId) {
      Alert.alert("Error", "No se pudo identificar el usuario. Por favor, inicia sesión nuevamente.");
      return;
    }
    
    Alert.alert(
      "Agregar Foto",
      "Elige una opción:",
      [
        {
          text: "Seleccionar Foto",
          onPress: () => pickImage()
        },
        {
          text: "Subir Manualmente (mejor calidad)",
          onPress: () => handleManualUpload()
        },
        {
          text: "Cancelar",
          style: "cancel"
        }
      ]
    );
  }

  // Manejar la subida manual
  const handleManualUpload = async () => {
    if (!userId) {
      Alert.alert("Error", "No se pudo identificar el usuario.");
      return;
    }

    setUploading(true);
    
    try {
      const result = await createPresignedUrl(userId, "trick_photos", "jpg");
      
      if (!result) {
        Alert.alert("Error", "No se pudo crear una URL para subida. Intenta más tarde.");
        setUploading(false);
        return;
      }
      
      // Almacenar URL para referencia posterior
      updateTrickData({ photo_temp_path: result.fileUrl });
      
      // Mostrar instrucciones
      Alert.alert(
        "Subida Manual",
        "Vamos a abrir un navegador donde podrás subir la imagen con mejor calidad.\n\n" +
        "1. Selecciona el archivo en tu dispositivo\n" +
        "2. Espera a que se complete la subida\n" +
        "3. Regresa a la app y confirma",
        [
          {
            text: "Cancelar",
            style: "cancel",
            onPress: () => {
              updateTrickData({ photo_temp_path: null });
              setUploading(false);
            }
          },
          {
            text: "Abrir Navegador",
            onPress: async () => {
              // Abrir URL en navegador
              await Linking.openURL(result.signedUrl);
              
              // Cuando el usuario regrese, preguntar si la subida fue exitosa
              setTimeout(() => {
                setUploading(false);
                
                Alert.alert(
                  "¿Completaste la subida?",
                  "¿Has subido la imagen correctamente?",
                  [
                    {
                      text: "No, cancelar",
                      style: "cancel",
                      onPress: () => updateTrickData({ photo_temp_path: null })
                    },
                    {
                      text: "Sí, completado",
                      onPress: () => {
                        // Actualizar con la URL real
                        if (trickData.photo_temp_path) {
                          updateTrickData({ 
                            photo_url: trickData.photo_temp_path,
                            photo_temp_path: null 
                          });
                        }
                      }
                    }
                  ]
                );
              }, 1000);
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error en handleManualUpload:", error);
      Alert.alert("Error", "No se pudo iniciar el proceso de subida.");
      setUploading(false);
    }
  };

  // Seleccionar imagen
  const pickImage = async () => {
    try {
      const hasPermission = await requestMediaLibraryPermissions("image", t);
      if (!hasPermission) return;

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        aspect: [4, 3] as [number, number]
      };

      const result = await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        processImageForUpload(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error seleccionando imagen:", error);
      Alert.alert("Error", "No se pudo seleccionar la imagen.");
    }
  };

  // Procesar imagen para subida
  const processImageForUpload = async (uri: string) => {
    if (!userId) {
      Alert.alert("Error", "No se pudo identificar el usuario.");
      return;
    }

    try {
      setUploading(true);
      
      // Verificar tamaño
      const fileInfo = await getFileInfo(uri);
      
      // Verificar tamaño máximo y advertir
      if (fileInfo.size > 3) {
        Alert.alert(
          "Imagen demasiado grande",
          `La imagen tiene ${fileInfo.size.toFixed(1)}MB. ¿Deseas continuar o prefieres usar la opción "Subir Manualmente"?`,
          [
            {
              text: "Subir Manualmente",
              onPress: () => {
                setUploading(false);
                handleManualUpload();
              }
            },
            {
              text: "Continuar",
              onPress: () => uploadImageDirectly(uri)
            },
            {
              text: "Cancelar",
              style: "cancel",
              onPress: () => setUploading(false)
            }
          ]
        );
        return;
      }
      
      // Si el archivo es pequeño, continuar con la subida
      await uploadImageDirectly(uri);
    } catch (error) {
      console.error("Error procesando imagen:", error);
      Alert.alert("Error", "No se pudo procesar la imagen.");
      setUploading(false);
    }
  };

  // Método de subida directa
  const uploadImageDirectly = async (uri: string) => {
    if (!userId) {
      setUploading(false);
      return;
    }

    try {
      // Obtener extensión del archivo
      const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
      
      const publicUrl = await uploadFileToStorage(
        uri,
        userId,
        "trick_photos",
        mimeType,
        `photo.${extension}`
      );

      if (!publicUrl) {
        Alert.alert("Error de subida", "No se pudo subir la imagen. Intenta usar la opción 'Subir Manualmente'.");
        return;
      }
      
      // Actualizar datos
      updateTrickData({ photo_url: publicUrl });
      
      Alert.alert("Éxito", "Imagen subida correctamente");
    } catch (error) {
      console.error("Error en uploadImageDirectly:", error);
      Alert.alert("Error", "No se pudo completar la subida. Intenta con la opción 'Subir Manualmente'.");
    } finally {
      setUploading(false);
    }
  };

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
              <FileText size={20} color="white" />
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
          <StyledView>
            {trickData.photo_temp_path ? (
              <StyledView className="bg-white/10 rounded-lg p-4">
                <StyledText className="text-white mb-2">Subida manual en proceso</StyledText>
                <StyledView className="flex-row mt-2">
                  <StyledTouchableOpacity
                    onPress={() => updateTrickData({ photo_temp_path: null })}
                    className="bg-red-600 py-2 px-4 rounded-lg mr-4"
                  >
                    <StyledText className="text-white">Cancelar</StyledText>
                  </StyledTouchableOpacity>
                  
                  <StyledTouchableOpacity
                    onPress={() => {
                      if (trickData.photo_temp_path) {
                        updateTrickData({ 
                          photo_url: trickData.photo_temp_path,
                          photo_temp_path: null 
                        });
                      }
                    }}
                    className="bg-emerald-600 py-2 px-4 rounded-lg"
                  >
                    <StyledText className="text-white">Confirmar Subida</StyledText>
                  </StyledTouchableOpacity>
                </StyledView>
              </StyledView>
            ) : (
              <>
                <StyledView className="flex-row space-x-2 mb-2">
                  <StyledTouchableOpacity
                    onPress={pickImage}
                    disabled={uploading}
                    className="bg-emerald-700 p-4 rounded-lg flex-1 flex-row items-center justify-center"
                  >
                    {uploading ? (
                      <ActivityIndicator color="white" size="small" style={{marginRight: 8}} />
                    ) : (
                      <Camera size={24} color="white" />
                    )}
                    <StyledText className="text-white ml-2">
                      {uploading ? "Subiendo..." : t("uploadPhoto", "Upload Photo")}
                    </StyledText>
                  </StyledTouchableOpacity>
                  
                  <StyledTouchableOpacity
                    onPress={handleManualUpload}
                    disabled={uploading}
                    className="bg-blue-700 p-4 rounded-lg flex-row items-center justify-center"
                  >
                    <ExternalLink size={22} color="white" />
                    <StyledText className="text-white ml-2">
                      Subida Externa
                    </StyledText>
                  </StyledTouchableOpacity>
                </StyledView>
                <StyledText className="text-white/70 text-center text-xs">
                  ℹ️ Para fotos de alta calidad, usa la opción "Subida Externa"
                </StyledText>
              </>
            )}
          </StyledView>
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