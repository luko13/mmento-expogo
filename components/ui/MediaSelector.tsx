// components/ui/MediaSelector.tsx
import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Text,
  Alert,
  ScrollView,
  Animated,
} from "react-native";
import { styled } from "nativewind";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useEncryption } from "../../hooks/useEncryption";
import { BackgroundEncryptionService } from "../../utils/backgroundEncryption";
import CustomTooltip from "../ui/Tooltip";
import { backgroundEncryptionService } from "../../utils/backgroundEncryption";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledImage = styled(Image);

interface MediaFile {
  uri: string;
  taskId: string;
  fileName: string;
  isEncrypting: boolean;
  progress: number;
}

interface GlobalMediaStateValue {
  files: MediaFile[];
  progress: { [key: string]: number };
}

const globalMediaState = new Map<string, GlobalMediaStateValue>();

interface MediaSelectorProps {
  type: "photo" | "video";
  multiple?: boolean;
  maxFiles?: number;
  maxFileSize?: number; // en MB
  quality?: number;
  onFilesSelected?: (files: MediaFile[]) => void;
  onProgress?: (progress: number) => void;
  tooltip?: string;
  placeholder?: string;
  disableEncryption?: boolean; // Nueva prop
}

export interface MediaSelectorRef {
  getEncryptedFileIds: () => Promise<string[]>;
  clearSelection: () => void;
}

export const MediaSelector = forwardRef<MediaSelectorRef, MediaSelectorProps>(
  (props, ref) => {
    const {
      type,
      multiple = false,
      maxFiles = 10,
      maxFileSize = 50,
      quality = 0.8,
      onFilesSelected,
      onProgress,
      tooltip,
      placeholder,
      disableEncryption = false,
    } = props;

    const selectorId = useRef(`${type}_${Date.now()}`).current;
    const { t } = useTranslation();
    const [selectedFiles, setSelectedFiles] = useState<MediaFile[]>(() => {
      const saved = globalMediaState.get(selectorId);
      return saved?.files || [];
    });
    const [encryptionProgress, setEncryptionProgress] = useState<{
      [key: string]: number;
    }>(() => {
      const saved = globalMediaState.get(selectorId);
      return saved?.progress || {};
    });
    const { keyPair, getPublicKey, isReady: encryptionReady } = useEncryption();
    const progressAnimation = useRef(new Animated.Value(0)).current;

    // Guardar estado cuando cambie
    useEffect(() => {
      globalMediaState.set(selectorId, {
        files: selectedFiles,
        progress: encryptionProgress,
      });
    }, [selectedFiles, encryptionProgress, selectorId]);

    // Limpiar al desmontar el componente principal
    useEffect(() => {
      return () => {
        // Solo limpiar si el componente se desmonta definitivamente
        // (no durante navegación entre steps)
        setTimeout(() => {
          globalMediaState.delete(selectorId);
        }, 60000); // Mantener por 1 minuto
      };
    }, [selectorId]);

    // Cleanup ongoing encryption tasks when component unmounts
    useEffect(() => {
      return () => {
        if (!disableEncryption && selectedFiles.some((f) => f.isEncrypting)) {
          selectedFiles.forEach((file) => {
            if (file.isEncrypting) {
              backgroundEncryptionService.cancelTask(file.taskId);
            }
          });
        }
      };
    }, [selectedFiles, disableEncryption]);

    // Exposición de métodos al padre
    useImperativeHandle(ref, () => ({
      getEncryptedFileIds: async () => {
        // Si el cifrado está deshabilitado, devolver array vacío
        if (disableEncryption) {
          return [];
        }

        const fileIds: string[] = [];

        // Obtener IDs de archivos completados
        for (const file of selectedFiles) {
          if (!file.isEncrypting) {
            // Archivo ya completado - obtener el resultado de la tarea
            const task = backgroundEncryptionService.getTask(file.taskId);
            if (task?.status === "completed" && task.result) {
              fileIds.push(task.result);
            }
          }
        }

        // Esperar por cualquier cifrado en progreso si es necesario
        const encryptingFiles = selectedFiles.filter((f) => f.isEncrypting);
        if (encryptingFiles.length > 0) {
          const encryptingIds = encryptingFiles.map((f) => f.taskId);
          try {
            const results =
              await backgroundEncryptionService.waitForSpecificTasks(
                encryptingIds
              );
            fileIds.push(...results);
          } catch (error) {
            console.error("Error esperando archivos:", error);
          }
        }

        return fileIds;
      },
      clearSelection: () => {
        // Cancelar todas las tareas en progreso
        if (!disableEncryption) {
          selectedFiles.forEach((file) => {
            if (file.isEncrypting) {
              backgroundEncryptionService.cancelTask(file.taskId);
            }
          });
        }

        setSelectedFiles([]);
        setEncryptionProgress({});

        // Limpiar estado global
        globalMediaState.delete(selectorId);
      },
    }));

    const selectMedia = async () => {
      try {
        // Si el cifrado está deshabilitado, no verificar encryptionReady
        if (!disableEncryption && (!encryptionReady || !keyPair)) {
          Alert.alert(
            t("security.error", "Error de Seguridad"),
            t(
              "security.encryptionNotReady",
              "El sistema de cifrado no está listo"
            )
          );
          return;
        }

        // Verificar permisos
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            t("permissionRequired", "Permiso Requerido"),
            t("mediaLibraryPermission", "Necesitamos acceso a tu galería."),
            [{ text: t("ok", "OK") }]
          );
          return;
        }

        const options: ImagePicker.ImagePickerOptions = {
          mediaTypes: type === "photo" ? ["images"] : ["videos"],
          allowsMultipleSelection: multiple,
          quality: quality,
          videoMaxDuration: 60,
          allowsEditing: false,
        };

        const result = await ImagePicker.launchImageLibraryAsync(options);

        if (!result.canceled && result.assets) {
          const newFiles: MediaFile[] = [];

          // Verificar límites
          if (selectedFiles.length + result.assets.length > maxFiles) {
            Alert.alert(
              t("limitExceeded", "Límite excedido"),
              t("maxFilesMessage", `Máximo ${maxFiles} archivos permitidos`),
              [{ text: t("ok", "OK") }]
            );
            return;
          }

          // Procesar cada archivo
          for (const asset of result.assets) {
            // Verificar tamaño solo si es un archivo real (no data URI)
            if (!asset.uri.startsWith("data:")) {
              try {
                const fileInfo = await FileSystem.getInfoAsync(asset.uri);
                if (fileInfo.exists && "size" in fileInfo) {
                  const sizeMB = fileInfo.size / (1024 * 1024);
                  if (sizeMB > maxFileSize) {
                    Alert.alert(
                      t("fileTooLarge", "Archivo muy grande"),
                      t(
                        "fileSizeWarning",
                        `${
                          asset.fileName || "Archivo"
                        } excede el límite de ${maxFileSize}MB`
                      ),
                      [{ text: t("ok", "OK") }]
                    );
                    continue;
                  }
                }
              } catch (error) {}
            }

            // Si el cifrado está deshabilitado, solo agregar el archivo sin cifrar
            if (disableEncryption) {
              const fileName =
                type === "photo"
                  ? `IMG_${Date.now()}_${newFiles.length}.jpg`
                  : `VID_${Date.now()}_${newFiles.length}.mp4`;

              newFiles.push({
                uri: asset.uri,
                taskId: `local_${Date.now()}_${newFiles.length}`, // ID temporal
                fileName,
                isEncrypting: false,
                progress: 100,
              });
            } else {
              // Generar nombre de archivo
              const fileName =
                type === "photo"
                  ? `IMG_${Date.now()}_${newFiles.length}.jpg`
                  : `VID_${Date.now()}_${newFiles.length}.mp4`;

              // Iniciar cifrado en background
              const taskId = await backgroundEncryptionService.startEncryption({
                uri: asset.uri,
                type: asset.type || type,
                fileName,
                userId: keyPair!.publicKey,
                onProgress: (progress) => {
                  setEncryptionProgress((prev) => {
                    const updated = { ...prev, [asset.uri]: progress };

                    // Calcular progreso total
                    const allProgress = Object.values(updated);
                    const totalProgress =
                      allProgress.reduce((sum, p) => sum + p, 0) /
                      allProgress.length;

                    // Animar progreso
                    Animated.timing(progressAnimation, {
                      toValue: totalProgress,
                      duration: 300,
                      useNativeDriver: false,
                    }).start();

                    onProgress?.(totalProgress);

                    // Actualizar estado del archivo
                    setSelectedFiles((prev) =>
                      prev.map((f) =>
                        f.uri === asset.uri
                          ? { ...f, progress, isEncrypting: progress < 100 }
                          : f
                      )
                    );

                    return updated;
                  });
                },
              });

              newFiles.push({
                uri: asset.uri,
                taskId,
                fileName,
                isEncrypting: true,
                progress: 0,
              });
            }
          }

          const updatedFiles = [...selectedFiles, ...newFiles];
          setSelectedFiles(updatedFiles);
          onFilesSelected?.(updatedFiles);
        }
      } catch (error) {
        console.error("Error selecting media:", error);
        Alert.alert(
          t("error", "Error"),
          t("mediaPickError", "Error al seleccionar archivos"),
          [{ text: t("ok", "OK") }]
        );
      }
    };

    const removeFile = (index: number) => {
      const file = selectedFiles[index];

      // Cancelar cifrado si está en progreso
      if (!disableEncryption && file.isEncrypting) {
        backgroundEncryptionService.cancelTask(file.taskId);
      }

      const updatedFiles = selectedFiles.filter((_, i) => i !== index);
      setSelectedFiles(updatedFiles);

      // Actualizar progreso
      const { [file.uri]: _, ...restProgress } = encryptionProgress;
      setEncryptionProgress(restProgress);

      // Limpiar del estado global también
      const saved = globalMediaState.get(selectorId);
      if (saved) {
        globalMediaState.set(selectorId, {
          files: updatedFiles,
          progress: restProgress,
        });
      }

      onFilesSelected?.(updatedFiles);
    };

    const getButtonText = () => {
      if (selectedFiles.length > 0) {
        if (type === "video") {
          // Para videos, mostrar el nombre del archivo o estado
          const file = selectedFiles[0];
          if (!disableEncryption && file.isEncrypting) {
            return t(
              "videoEncrypting",
              `Cifrando video... ${Math.round(file.progress)}%`
            );
          }
          return file.fileName;
        } else {
          // Para fotos, mantener el comportamiento actual
          return t(
            "photosSelected",
            `${selectedFiles.length} fotos seleccionadas`
          );
        }
      }

      return (
        placeholder ||
        (type === "photo"
          ? t("uploadPhotos", "Subir Fotos")
          : t("uploadVideos", "Subir Videos"))
      );
    };

    const getIcon = () => {
      if (
        !disableEncryption &&
        selectedFiles.length > 0 &&
        selectedFiles.some((f) => f.isEncrypting)
      ) {
        return <Feather name="lock" size={16} color="white" />;
      }
      return <Feather name="upload" size={16} color="white" />;
    };

    return (
      <StyledView>
        {/* Selector principal */}
        <StyledView className="flex-row mb-6">
          {tooltip ? (
            <CustomTooltip
              text={tooltip}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-[48px] h-[48px] bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <Feather
                  name={type === "photo" ? "image" : "video"}
                  size={28}
                  color="white"
                />
              </StyledView>
            </CustomTooltip>
          ) : (
            <StyledView className="w-[48px] h-[48px] bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather
                name={type === "photo" ? "image" : "video"}
                size={28}
                color="white"
              />
            </StyledView>
          )}

          <StyledView className="flex-1">
            <StyledTouchableOpacity
              onPress={
                selectedFiles.length > 0 && type === "video"
                  ? () => removeFile(0)
                  : selectMedia
              }
              disabled={!disableEncryption && !encryptionReady}
              className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg px-3 py-[15px] border border-[#5bb9a3] flex-row items-center justify-between"
            >
              <StyledView className="flex-1 flex-row items-center">
                <StyledText className="text-white/70 flex-1">
                  {getButtonText()}
                </StyledText>
                <StyledView className="flex-row items-center">
                  {/* Para videos con archivo seleccionado, mostrar X */}
                  {type === "video" && selectedFiles.length > 0 ? (
                    <Feather
                      name="x"
                      size={16}
                      color="#ef4444"
                      style={{ marginLeft: 4 }}
                    />
                  ) : (
                    getIcon()
                  )}
                </StyledView>
              </StyledView>
            </StyledTouchableOpacity>

            {/* Barra de progreso para videos */}
            {!disableEncryption &&
              type === "video" &&
              selectedFiles.length > 0 &&
              selectedFiles[0].isEncrypting && (
                <StyledView className="mt-2 bg-white/10 rounded-full h-2 overflow-hidden">
                  <Animated.View
                    style={{
                      height: "100%",
                      backgroundColor: "#10b981",
                      width: `${
                        encryptionProgress[selectedFiles[0].uri] || 0
                      }%`,
                    }}
                  />
                </StyledView>
              )}

            {/* Barra de progreso global para fotos */}
            {!disableEncryption &&
              type === "photo" &&
              selectedFiles.some((f) => f.isEncrypting) && (
                <StyledView className="mt-2 bg-white/10 rounded-full h-2 overflow-hidden">
                  <Animated.View
                    style={{
                      height: "100%",
                      backgroundColor: "#10b981",
                      width: progressAnimation.interpolate({
                        inputRange: [0, 100],
                        outputRange: ["0%", "100%"],
                      }),
                    }}
                  />
                </StyledView>
              )}
          </StyledView>
        </StyledView>

        {/* Preview en estilo pills SOLO PARA FOTOS */}
        {type === "photo" && selectedFiles.length > 0 && (
          <StyledView className="mb-6 -mt-3">
            <StyledScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
            >
              {selectedFiles.map((file, index) => (
                <StyledView
                  key={file.uri}
                  className="mr-2 bg-white/5 border border-emerald-500/20 rounded-full flex-row items-center px-2 py-1"
                >
                  {/* Thumbnail */}
                  <StyledView className="relative">
                    <StyledImage
                      source={{ uri: file.uri }}
                      className="w-6 h-6 rounded-full mr-2"
                    />

                    {/* Indicador de cifrado */}
                    {!disableEncryption && file.isEncrypting && (
                      <StyledView className="absolute inset-0 rounded-full bg-black/50 items-center justify-center">
                        <Feather name="lock" size={10} color="white" />
                      </StyledView>
                    )}
                  </StyledView>

                  {/* Nombre del archivo */}
                  <StyledText
                    className="text-white/50 text-xs mr-2"
                    numberOfLines={1}
                  >
                    {file.fileName}
                  </StyledText>

                  {/* Progreso o botón de eliminar */}
                  {!disableEncryption && file.isEncrypting ? (
                    <StyledText className="text-emerald-400/60 text-xs mr-2">
                      {Math.round(file.progress)}%
                    </StyledText>
                  ) : (
                    <StyledTouchableOpacity
                      onPress={() => removeFile(index)}
                      className="p-1"
                    >
                      <Feather
                        name="x"
                        size={12}
                        color="rgba(255,255,255,0.5)"
                      />
                    </StyledTouchableOpacity>
                  )}
                </StyledView>
              ))}
            </StyledScrollView>

            {/* Indicador de cifrado en progreso */}
            {!disableEncryption &&
              selectedFiles.some((f) => f.isEncrypting) && (
                <StyledView className="flex-row items-center justify-center mt-2">
                  <Feather
                    name="shield"
                    size={12}
                    color="rgba(16, 185, 129, 0.6)"
                  />
                  <StyledText className="text-emerald-500/60 text-xs ml-1">
                    {t(
                      "encryptingInBackground",
                      "Cifrando en segundo plano..."
                    )}
                  </StyledText>
                </StyledView>
              )}
          </StyledView>
        )}
      </StyledView>
    );
  }
);

MediaSelector.displayName = "MediaSelector";
