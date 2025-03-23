"use client"

import { useState, useEffect } from "react"
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  Platform, 
  ActivityIndicator, 
  Linking,
  Dimensions,
  ProgressBarAndroid,
  StyleSheet
} from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Video, Clock, RefreshCw, BarChart3, ExternalLink } from "lucide-react-native"
import { BlurView } from "expo-blur"
import type { MagicTrick } from "../AddMagicWizard"
import * as ImagePicker from "expo-image-picker"
import { supabase } from "../../../lib/supabase"
import { 
  requestMediaLibraryPermissions, 
  getFileInfo, 
  createPresignedUrl, 
  uploadFileToStorage,
  FILE_SIZE_LIMITS,
  STORAGE_BUCKET
} from "../../../utils/mediaUtils"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledProgressBar = styled(ProgressBarAndroid)

// Obtener el ancho de la pantalla para la barra de progreso en iOS
const screenWidth = Dimensions.get('window').width - 40 // -40 para padding

interface StepProps {
  trickData: MagicTrick
  updateTrickData: (data: Partial<MagicTrick>) => void
}

export default function EffectStep({ trickData, updateTrickData }: StepProps) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null)
  const [videoInfo, setVideoInfo] = useState<{duration?: number, size?: number}>({})
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

  // Dificultades disponibles
  const difficulties = [
    { value: "beginner", label: t("difficulty.beginner", "Beginner") },
    { value: "easy", label: t("difficulty.easy", "Easy") },
    { value: "intermediate", label: t("difficulty.intermediate", "Intermediate") },
    { value: "advanced", label: t("difficulty.advanced", "Advanced") },
    { value: "expert", label: t("difficulty.expert", "Expert") },
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
      const result = await createPresignedUrl(userId, "effect_videos");
      
      if (!result) {
        Alert.alert("Error", "No se pudo crear una URL para subida. Intenta más tarde.");
        setUploading(false);
        return;
      }
      
      // Almacenar URL para referencia posterior
      updateTrickData({ effect_video_temp_path: result.fileUrl });
      
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
              updateTrickData({ effect_video_temp_path: null });
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
                      onPress: () => updateTrickData({ effect_video_temp_path: null })
                    },
                    {
                      text: "Sí, completado",
                      onPress: () => {
                        // Actualizar con la URL real
                        if (trickData.effect_video_temp_path) {
                          updateTrickData({ 
                            effect_video_url: trickData.effect_video_temp_path,
                            effect_video_temp_path: null 
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
        videoMaxDuration: 300, // 5 minutos máximo
      };

      const result = await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        processVideoForUpload(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error seleccionando video:", error);
      Alert.alert("Error", "No se pudo seleccionar el video.");
    }
  };

  // Procesar video para subida
  const processVideoForUpload = async (uri: string) => {
    if (!userId) {
      Alert.alert("Error", "No se pudo identificar el usuario.");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Verificar tamaño
      const fileInfo = await getFileInfo(uri);
      setVideoInfo({ size: fileInfo.size });
      
      // Verificar tamaño máximo y advertir
      if (fileInfo.size > FILE_SIZE_LIMITS.VIDEO_LARGE) {
        Alert.alert(
          t("fileTooLarge", "Archivo Demasiado Grande"),
          t("fileSizeWarning", `El video tiene ${fileInfo.size.toFixed(1)}MB y excede el límite máximo de ${FILE_SIZE_LIMITS.VIDEO_LARGE}MB.`),
          [{ text: t("ok", "Aceptar"), onPress: () => setUploading(false) }]
        );
        return;
      }
      
      // Si el video es demasiado grande para subida directa, sugerir subida manual
      if (fileInfo.size > FILE_SIZE_LIMITS.VIDEO_SMALL) {
        Alert.alert(
          t("videoLargeWarning", "Video grande detectado"),
          t("fileSizeWarning", `El video tiene ${fileInfo.size.toFixed(1)}MB. Para mejor rendimiento, se recomienda usar la subida manual.`),
          [
            {
              text: t("manualUpload", "Subir Manualmente"),
              onPress: () => {
                setUploading(false);
                handleManualUpload();
              }
            },
            {
              text: t("continueAnyway", "Continuar de todos modos"),
              onPress: () => uploadVideo(uri)
            },
            {
              text: t("cancel", "Cancelar"),
              style: "cancel",
              onPress: () => setUploading(false)
            }
          ]
        );
        return;
      }
      
      // Si el archivo es pequeño, continuar con la subida
      await uploadVideo(uri);
    } catch (error) {
      console.error("Error procesando video:", error);
      Alert.alert("Error", "No se pudo procesar el video.");
      setUploading(false);
    }
  };

  // Método unificado de subida
  const uploadVideo = async (uri: string) => {
    if (!userId) {
      setUploading(false);
      return;
    }

    try {
      // Mostrar alerta de que la app podría bloquearse momentáneamente
      // Durante la preparación del archivo (especialmente en iOS)
      Alert.alert(
        "Iniciando subida",
        "La app podría tardar unos momentos en preparar el video. Por favor, espera...",
        [{ text: "Aceptar" }],
        { cancelable: false }
      );
      
      // Usar la función unificada que selecciona el mejor método
      const publicUrl = await uploadFileToStorage(
        uri,
        userId,
        "effect_videos",
        "video/mp4",
        "video.mp4",
        (progress) => {
          // Actualizar el progreso
          setUploadProgress(progress);
        }
      );

      if (!publicUrl) {
        Alert.alert("Error de subida", "No se pudo subir el video. Intenta usar la opción 'Subir Manualmente'.");
        return;
      }
      
      // Actualizar datos
      updateTrickData({ effect_video_url: publicUrl });
      
      Alert.alert("Éxito", "Video subido correctamente");
    } catch (error) {
      console.error("Error en uploadVideo:", error);
      Alert.alert("Error", "No se pudo completar la subida. Intenta con la opción 'Subir Manualmente'.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Renderizar barra de progreso
  const renderProgressBar = () => {
    // Si no está subiendo o progreso es 0, no mostrar
    if (!uploading || uploadProgress === 0) return null;
    
    return (
      <StyledView className="my-2">
        <StyledText className="text-white text-center mb-1">
          {`Subiendo: ${Math.round(uploadProgress)}%`}
        </StyledText>
        {Platform.OS === 'android' ? (
          <StyledProgressBar 
            styleAttr="Horizontal"
            indeterminate={false}
            progress={uploadProgress / 100}
            color="#10b981" // color verde esmeralda de Tailwind
          />
        ) : (
          // En iOS usamos una barra personalizada
          <StyledView className="h-2 bg-white/20 rounded-full overflow-hidden">
            <StyledView 
              className="h-full bg-emerald-600" 
              style={{ width: `${uploadProgress}%` }}
            />
          </StyledView>
        )}
      </StyledView>
    );
  };

  return (
    <StyledView className="flex-1">
      {/* Descripción del efecto */}
      <StyledView className="mb-6">
        <StyledText className="text-white text-lg mb-2">{t("effectDescription", "Effect Description")}*</StyledText>
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
          <StyledView>
            {trickData.effect_video_temp_path ? (
              <StyledView className="bg-white/10 rounded-lg p-4">
                <StyledText className="text-white mb-2">Subida manual en proceso</StyledText>
                <StyledView className="flex-row mt-2">
                  <StyledTouchableOpacity
                    onPress={() => updateTrickData({ effect_video_temp_path: null })}
                    className="bg-red-600 py-2 px-4 rounded-lg mr-4"
                  >
                    <StyledText className="text-white">Cancelar</StyledText>
                  </StyledTouchableOpacity>
                  
                  <StyledTouchableOpacity
                    onPress={() => {
                      if (trickData.effect_video_temp_path) {
                        updateTrickData({ 
                          effect_video_url: trickData.effect_video_temp_path,
                          effect_video_temp_path: null 
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
                    {uploading && uploadProgress === 0 ? (
                      <ActivityIndicator color="white" size="small" style={{marginRight: 8}} />
                    ) : (
                      <Video size={24} color="white" />
                    )}
                    <StyledText className="text-white ml-2">
                      {uploading && uploadProgress === 0 ? "Preparando..." : "Agregar Video"}
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
                
                {/* Barra de progreso */}
                {renderProgressBar()}
                
                <StyledText className="text-white/70 text-center text-xs">
                  ℹ️ Para videos de alta calidad, usa la opción "Subida Externa"
                </StyledText>
              </>
            )}
          </StyledView>
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
              <Clock size={20} color="white" />
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
              <RefreshCw size={20} color="white" />
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
              <BarChart3 size={16} color="white" />
              <StyledText className="text-white ml-1">{difficulty.label}</StyledText>
            </StyledTouchableOpacity>
          ))}
        </StyledView>
      </StyledView>
    </StyledView>
  )
}