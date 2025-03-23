"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, Alert, Platform, ActivityIndicator, Linking } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Video, Plus, ExternalLink } from "lucide-react-native"
import { BlurView } from "expo-blur"
import type { MagicTrick } from "../AddMagicWizard"
import * as ImagePicker from "expo-image-picker"
import { supabase } from "../../../lib/supabase"
import { 
  requestMediaLibraryPermissions, 
  getFileInfo, 
  createPresignedUrl, 
  uploadFileToStorage,
  STORAGE_BUCKET
} from "../../../utils/mediaUtils"

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

  // Agregar nuevo material
  const addMaterial = () => {
    if (newMaterial.trim()) {
      updateTrickData({
        special_materials: [...(trickData.special_materials || []), newMaterial.trim()]
      })
      setNewMaterial("")
    }
  }

  // Eliminar material
  const removeMaterial = (index: number) => {
    const updatedMaterials = [...trickData.special_materials]
    updatedMaterials.splice(index, 1)
    updateTrickData({ special_materials: updatedMaterials })
  }

  // Elegir entre opciones
  const showVideoOptions = async () => {
    if (!userId) {
      Alert.alert("Error", "No se pudo identificar el usuario. Por favor, inicia sesión nuevamente.");
      return;
    }
    
    Alert.alert(
      "Agregar Video",
      "Elige una opción:",
      [
        {
          text: "Seleccionar Video",
          onPress: () => pickVideo()
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
      const result = await createPresignedUrl(userId, "secret_videos");
      
      if (!result) {
        Alert.alert("Error", "No se pudo crear una URL para subida. Intenta más tarde.");
        setUploading(false);
        return;
      }
      
      // Almacenar URL para referencia posterior
      updateTrickData({ secret_video_temp_path: result.fileUrl });
      
      // Mostrar instrucciones
      Alert.alert(
        "Subida Manual",
        "Vamos a abrir un navegador donde podrás subir el video con mejor calidad.\n\n" +
        "1. Selecciona el archivo en tu dispositivo\n" +
        "2. Espera a que se complete la subida\n" +
        "3. Regresa a la app y confirma",
        [
          {
            text: "Cancelar",
            style: "cancel",
            onPress: () => {
              updateTrickData({ secret_video_temp_path: null });
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
                  "¿Has subido el video correctamente?",
                  [
                    {
                      text: "No, cancelar",
                      style: "cancel",
                      onPress: () => updateTrickData({ secret_video_temp_path: null })
                    },
                    {
                      text: "Sí, completado",
                      onPress: () => {
                        // Actualizar con la URL real
                        if (trickData.secret_video_temp_path) {
                          updateTrickData({ 
                            secret_video_url: trickData.secret_video_temp_path,
                            secret_video_temp_path: null 
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

  // Seleccionar video
  const pickVideo = async () => {
    try {
      const hasPermission = await requestMediaLibraryPermissions("video", t);
      if (!hasPermission) return;

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.5,
        videoMaxDuration: 180,
      };

      Alert.alert(
        "⚠️ Advertencia",
        "La subida directa desde la app está limitada a videos pequeños y puede fallar. Para videos de mejor calidad, usa la opción 'Subir Manualmente'.",
        [
          {
            text: "Cancelar",
            style: "cancel"
          },
          {
            text: "Continuar",
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync(options);
              if (!result.canceled && result.assets && result.assets.length > 0) {
                processVideoForUpload(result.assets[0].uri);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error seleccionando video:", error);
      Alert.alert("Error", "No se pudo seleccionar el video.");
    }
  }

  // Procesar video para subida
  const processVideoForUpload = async (uri: string) => {
    if (!userId) {
      Alert.alert("Error", "No se pudo identificar el usuario.");
      return;
    }

    try {
      setUploading(true);
      
      // Verificar tamaño
      const fileInfo = await getFileInfo(uri);
      
      // Verificar tamaño máximo y advertir
      if (fileInfo.size > 5) {
        Alert.alert(
          "Video demasiado grande",
          `El video tiene ${fileInfo.size.toFixed(1)}MB. La app podría cerrarse durante la subida. ¿Prefieres usar la opción "Subir Manualmente"?`,
          [
            {
              text: "Subir Manualmente",
              onPress: () => {
                setUploading(false);
                handleManualUpload();
              }
            },
            {
              text: "Continuar de todos modos",
              onPress: () => uploadVideoDirectly(uri)
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
      await uploadVideoDirectly(uri);
    } catch (error) {
      console.error("Error procesando video:", error);
      Alert.alert("Error", "No se pudo procesar el video.");
      setUploading(false);
    }
  }

  // Método de subida directa
  const uploadVideoDirectly = async (uri: string) => {
    if (!userId) {
      setUploading(false);
      return;
    }

    try {
      const publicUrl = await uploadFileToStorage(
        uri,
        userId,
        "secret_videos",
        "video/mp4",
        "video.mp4"
      );

      if (!publicUrl) {
        Alert.alert("Error de subida", "No se pudo subir el video. Intenta usar la opción 'Subir Manualmente'.");
        return;
      }
      
      // Actualizar datos
      updateTrickData({ secret_video_url: publicUrl });
      
      Alert.alert("Éxito", "Video subido correctamente");
    } catch (error) {
      console.error("Error en uploadVideoDirectly:", error);
      Alert.alert("Error", "No se pudo completar la subida. Intenta con la opción 'Subir Manualmente'.");
    } finally {
      setUploading(false);
    }
  };

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
          <StyledView>
            {trickData.secret_video_temp_path ? (
              <StyledView className="bg-white/10 rounded-lg p-4">
                <StyledText className="text-white mb-2">Subida manual en proceso</StyledText>
                <StyledView className="flex-row mt-2">
                  <StyledTouchableOpacity
                    onPress={() => updateTrickData({ secret_video_temp_path: null })}
                    className="bg-red-600 py-2 px-4 rounded-lg mr-4"
                  >
                    <StyledText className="text-white">Cancelar</StyledText>
                  </StyledTouchableOpacity>
                  
                  <StyledTouchableOpacity
                    onPress={() => {
                      if (trickData.secret_video_temp_path) {
                        updateTrickData({ 
                          secret_video_url: trickData.secret_video_temp_path,
                          secret_video_temp_path: null 
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
                    onPress={showVideoOptions}
                    disabled={uploading}
                    className="bg-emerald-700 p-4 rounded-lg flex-1 flex-row items-center justify-center"
                  >
                    {uploading ? (
                      <ActivityIndicator color="white" size="small" style={{marginRight: 8}} />
                    ) : (
                      <Video size={24} color="white" />
                    )}
                    <StyledText className="text-white ml-2">
                      {uploading ? "Subiendo..." : "Agregar Video"}
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
                  ℹ️ Para videos de alta calidad, usa la opción "Subida Externa"
                </StyledText>
              </>
            )}
          </StyledView>
        )}
      </StyledView>

      {/* Materiales especiales */}
      <StyledView className="mb-6">
        <StyledText className="text-white text-lg mb-2">{t("specialMaterials", "Special Materials")}</StyledText>
        
        {/* Agregar nuevo material */}
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
            <Plus size={24} color="white" />
          </StyledTouchableOpacity>
        </StyledView>
        
        {/* Lista de materiales */}
        {trickData.special_materials && trickData.special_materials.length > 0 ? (
          <StyledView className="bg-white/10 p-3 rounded-lg">
            <StyledText className="text-white mb-2">{t("materialsList", "Materials List")}:</StyledText>
            {trickData.special_materials.map((material, index) => (
              <StyledView key={index} className="flex-row justify-between items-center mb-1">
                <StyledText className="text-white">• {material}</StyledText>
                <StyledTouchableOpacity onPress={() => removeMaterial(index)}>
                  <StyledText className="text-red-500">✕</StyledText>
                </StyledTouchableOpacity>
              </StyledView>
            ))}
          </StyledView>
        ) : (
          <StyledText className="text-white/50 ml-2">
            No hay materiales especiales agregados todavía.
          </StyledText>
        )}
      </StyledView>
    </StyledView>
  )
}