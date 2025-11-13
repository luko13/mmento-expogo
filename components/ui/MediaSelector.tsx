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
  Modal,
  Dimensions,
  Platform,
  AppState,
  ActivityIndicator,
  FlatList,
  PanResponder,
} from "react-native";
import { styled } from "nativewind";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import {
  CameraView,
  CameraType,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import CustomTooltip from "../ui/Tooltip";
import { fontNames } from "../../app/_layout";
import { BlurView } from "expo-blur";
import { copyToPersistentStorage, cleanupOldFiles } from "../../utils/fileHelpers";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledImage = styled(Image);
const StyledBlurView = styled(BlurView);

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface MediaFile {
  uri: string;
  fileName: string;
  isExisting?: boolean; // Flag para indicar que es un archivo que ya existe en el servidor
}

interface MediaSelectorProps {
  type: "photo" | "video";
  multiple?: boolean;
  maxFiles?: number;
  maxFileSize?: number; // en MB
  quality?: number;
  onFilesSelected?: (files: MediaFile[]) => void;
  onFileRemoved?: (file: MediaFile) => void; // Callback cuando se elimina un archivo existente
  tooltip?: string;
  placeholder?: string;
  disableEncryption?: boolean;
  initialFiles?: MediaFile[];
  maxVideoDuration?: number; // en segundos
}

export interface MediaSelectorRef {
  getSelectedFiles: () => MediaFile[];
  clearSelection: () => void;
}

// Componente de Modal de Selección
const MediaSourceModal = ({
  visible,
  onClose,
  onSelectGallery,
  onSelectCamera,
  type,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectGallery: () => void;
  onSelectCamera: () => void;
  type: "photo" | "video";
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <StyledBlurView
        intensity={10}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          activeOpacity={1}
          onPress={onClose}
        />

        <StyledView style={{ width: screenWidth * 0.9, maxWidth: 400 }}>
          {/* Wrapper con sombras */}
          <StyledView
            style={{
              borderRadius: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Blur container recortado */}
            <StyledBlurView
              intensity={40}
              tint="dark"
              experimentalBlurMethod="dimezisBlurView"
              style={{
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: "rgba(255, 255, 255, 0.30)",
                borderWidth: 1,
                borderColor: "rgba(200, 200, 200, 0.4)",
              }}
            >
              {/* Content */}
              <StyledView className="p-6">
                <StyledText
                  className="text-white text-xl text-center mb-6"
                  style={{
                    fontFamily: fontNames.semiBold,
                    fontSize: 24,
                    includeFontPadding: false,
                  }}
                >
                  {type === "photo"
                    ? t("selectPhotoSource", "Seleccionar fuente")
                    : t("selectVideoSource", "Seleccionar fuente")}
                </StyledText>

                {/* Opción de Cámara */}
                <StyledTouchableOpacity
                  onPress={onSelectCamera}
                  className="mb-3"
                  style={{
                    borderBottomWidth: 0.5,
                    borderBottomColor: "rgba(200, 200, 200, 0.3)",
                    paddingBottom: 16,
                  }}
                >
                  <StyledView className="flex-row items-center">
                    <StyledView className="w-12 h-12 bg-emerald-500/20 rounded-full items-center justify-center mr-4">
                      <Feather name="camera" size={24} color="#10b981" />
                    </StyledView>
                    <StyledView className="flex-1">
                      <StyledText
                        className="text-white text-base"
                        style={{
                          fontFamily: fontNames.medium,
                          fontSize: 16,
                          includeFontPadding: false,
                        }}
                      >
                        {type === "photo"
                          ? t("takePhoto", "Tomar foto")
                          : t("recordVideo", "Grabar video")}
                      </StyledText>
                      <StyledText
                        className="text-white/60 text-sm mt-1"
                        style={{
                          fontFamily: fontNames.light,
                          fontSize: 14,
                          includeFontPadding: false,
                        }}
                      >
                        {type === "photo"
                          ? t("useCamera", "Usar la cámara")
                          : t("recordNewVideo", "Grabar un nuevo video")}
                      </StyledText>
                    </StyledView>
                  </StyledView>
                </StyledTouchableOpacity>

                {/* Opción de Galería */}
                <StyledTouchableOpacity
                  onPress={onSelectGallery}
                  className="mb-3"
                  style={{
                    borderBottomWidth: 0.5,
                    borderBottomColor: "rgba(200, 200, 200, 0.3)",
                    paddingBottom: 16,
                  }}
                >
                  <StyledView className="flex-row items-center">
                    <StyledView className="w-12 h-12 bg-emerald-500/20 rounded-full items-center justify-center mr-4">
                      <MaterialIcons
                        name="photo-library"
                        size={24}
                        color="#10b981"
                      />
                    </StyledView>
                    <StyledView className="flex-1">
                      <StyledText
                        className="text-white text-base"
                        style={{
                          fontFamily: fontNames.medium,
                          fontSize: 16,
                          includeFontPadding: false,
                        }}
                      >
                        {t("gallery", "Galería")}
                      </StyledText>
                      <StyledText
                        className="text-white/60 text-sm mt-1"
                        style={{
                          fontFamily: fontNames.light,
                          fontSize: 14,
                          includeFontPadding: false,
                        }}
                      >
                        {type === "photo"
                          ? t("selectFromGallery", "Seleccionar de tu galería")
                          : t(
                              "selectVideoFromGallery",
                              "Seleccionar video existente"
                            )}
                      </StyledText>
                    </StyledView>
                  </StyledView>
                </StyledTouchableOpacity>

                {/* Botón de Cancelar */}
                <StyledTouchableOpacity
                  onPress={onClose}
                  className="py-3 items-center"
                >
                  <StyledText
                    className="text-white/50 text-base"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 16,
                      includeFontPadding: false,
                    }}
                  >
                    {t("cancel", "Cancelar")}
                  </StyledText>
                </StyledTouchableOpacity>
              </StyledView>
            </StyledBlurView>
          </StyledView>
        </StyledView>
      </StyledBlurView>
    </Modal>
  );
};

// Componente de Cámara
const CameraScreen = ({
  visible,
  onClose,
  onCapture,
  type,
  maxDuration = 60,
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
  type: "photo" | "video";
  maxDuration?: number;
}) => {
  const { t } = useTranslation();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] =
    useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      // Request permissions when modal opens
      (async () => {
        if (!cameraPermission?.granted) {
          await requestCameraPermission();
        }
        if (type === "video" && !microphonePermission?.granted) {
          await requestMicrophonePermission();
        }
      })();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [visible, type]);

  useEffect(() => {
    if (recordingDuration >= maxDuration && isRecording) {
      stopRecording();
    }
  }, [recordingDuration, maxDuration, isRecording]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background" && isRecording) {
        stopRecording();
      }
    });

    return () => subscription?.remove();
  }, [isRecording]);

  const toggleCameraType = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const takePicture = async () => {
    if (!cameraRef.current || !isCameraReady) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        exif: false,
        skipProcessing: false,
      });

      if (photo) {
        onCapture(photo.uri);
        onClose();
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert(t("error"), t("errorTakingPhoto", "Error al tomar la foto"));
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || !isCameraReady || isRecording) return;

    try {
      setIsRecording(true);
      setRecordingDuration(0);

      // Iniciar timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      const video = await cameraRef.current.recordAsync({
        maxDuration: maxDuration,
      });

      if (video) {
        onCapture(video.uri);
        onClose();
      }
    } catch (error) {
      console.error("Error recording video:", error);
      Alert.alert(
        t("error"),
        t("errorRecordingVideo", "Error al grabar el video")
      );
    } finally {
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!visible) return null;

  // Loading state
  if (!cameraPermission) {
    return (
      <Modal visible={visible} animationType="slide">
        <StyledView className="flex-1 bg-black justify-center items-center">
          <StyledText className="text-white">
            {t("requestingPermission", "Solicitando permisos...")}
          </StyledText>
        </StyledView>
      </Modal>
    );
  }

  // Permission denied state for camera
  if (!cameraPermission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <StyledView className="flex-1 bg-black justify-center items-center p-6">
          <StyledText className="text-white text-center mb-4">
            {t(
              "cameraPermissionDenied",
              "No se ha concedido permiso para usar la cámara"
            )}
          </StyledText>
          <StyledTouchableOpacity
            onPress={async () => {
              const result = await requestCameraPermission();
              if (!result.granted) {
                onClose();
              }
            }}
            className="bg-emerald-500 px-6 py-3 rounded-lg mb-2"
          >
            <StyledText className="text-white">
              {t("grantPermission", "Conceder permiso")}
            </StyledText>
          </StyledTouchableOpacity>
          <StyledTouchableOpacity onPress={onClose} className="px-6 py-3">
            <StyledText className="text-white/60">
              {t("close", "Cerrar")}
            </StyledText>
          </StyledTouchableOpacity>
        </StyledView>
      </Modal>
    );
  }

  // Permission denied state for microphone (video only)
  if (type === "video" && !microphonePermission?.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <StyledView className="flex-1 bg-black justify-center items-center p-6">
          <StyledText className="text-white text-center mb-4">
            {t(
              "microphonePermissionDenied",
              "Se necesita permiso del micrófono para grabar videos"
            )}
          </StyledText>
          <StyledTouchableOpacity
            onPress={async () => {
              await requestMicrophonePermission();
            }}
            className="bg-emerald-500 px-6 py-3 rounded-lg mb-2"
          >
            <StyledText className="text-white">
              {t("grantPermission", "Conceder permiso")}
            </StyledText>
          </StyledTouchableOpacity>
          <StyledTouchableOpacity onPress={onClose} className="px-6 py-3">
            <StyledText className="text-white/60">
              {t("close", "Cerrar")}
            </StyledText>
          </StyledTouchableOpacity>
        </StyledView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <StyledView className="flex-1 bg-black">
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing={facing}
          mode={type === "video" ? "video" : "picture"}
          onCameraReady={() => setIsCameraReady(true)}
          onMountError={(error) => {
            console.error("Camera mount error:", error);
            Alert.alert(
              t("error"),
              t("cameraError", "Error al iniciar la cámara")
            );
            onClose();
          }}
        >
          {/* Header con controles */}
          <StyledView
            className="absolute top-0 left-0 right-0 p-4 z-10"
            style={{ paddingTop: 40 }}
          >
            <StyledView className="flex-row justify-between items-center">
              <StyledTouchableOpacity
                onPress={onClose}
                className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
              >
                <Feather name="x" size={24} color="white" />
              </StyledTouchableOpacity>

              {type === "video" && isRecording && (
                <StyledView className="bg-red-500 px-3 py-1 rounded-full flex-row items-center">
                  <StyledView className="w-2 h-2 bg-white rounded-full mr-2" />
                  <StyledText className="text-white font-semibold">
                    {formatDuration(recordingDuration)} /{" "}
                    {formatDuration(maxDuration)}
                  </StyledText>
                </StyledView>
              )}

              <StyledTouchableOpacity
                onPress={toggleCameraType}
                className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
              >
                <MaterialIcons name="flip-camera-ios" size={24} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Botón de captura/grabación */}
          <StyledView className="absolute bottom-0 left-0 right-0 pb-8 items-center">
            {type === "photo" ? (
              <StyledTouchableOpacity
                onPress={takePicture}
                disabled={!isCameraReady}
                className="w-20 h-20 rounded-full border-4 border-white items-center justify-center"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                  opacity: isCameraReady ? 1 : 0.5,
                }}
              >
                <StyledView className="w-16 h-16 rounded-full bg-white" />
              </StyledTouchableOpacity>
            ) : (
              <StyledTouchableOpacity
                onPress={isRecording ? stopRecording : startRecording}
                disabled={!isCameraReady}
                className="w-20 h-20 rounded-full border-4 border-white items-center justify-center"
                style={{
                  backgroundColor: isRecording
                    ? "rgba(255, 0, 0, 0.3)"
                    : "rgba(255, 255, 255, 0.3)",
                  opacity: isCameraReady ? 1 : 0.5,
                }}
              >
                <StyledView
                  className={`${
                    isRecording ? "w-8 h-8 rounded" : "w-16 h-16 rounded-full"
                  } ${isRecording ? "bg-red-500" : "bg-white"}`}
                />
              </StyledTouchableOpacity>
            )}
          </StyledView>
        </CameraView>
      </StyledView>
    </Modal>
  );
};

export const MediaSelector = forwardRef<MediaSelectorRef, MediaSelectorProps>(
  (props, ref) => {
    const {
      type,
      multiple = false,
      maxFiles = 10,
      maxFileSize = 50,
      quality = 0.8,
      onFilesSelected,
      onFileRemoved,
      tooltip,
      placeholder,
      initialFiles = [],
      maxVideoDuration = 60,
    } = props;

    const { t } = useTranslation();
    const [selectedFiles, setSelectedFiles] =
      useState<MediaFile[]>(initialFiles);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSourceModal, setShowSourceModal] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    // Actualizar selectedFiles cuando cambien los initialFiles
    useEffect(() => {
      if (initialFiles.length > 0 && selectedFiles.length === 0) {
        setSelectedFiles(initialFiles);
      }
    }, [initialFiles]);

    // Cleanup temporary files on unmount
    useEffect(() => {
      return () => {
        if (Platform.OS !== "web") {
          FileSystem.readDirectoryAsync(FileSystem.cacheDirectory || "")
            .then((files) => {
              const cameraFiles = files.filter(
                (f) => f.includes("Camera") || f.includes("ImagePicker")
              );
              cameraFiles.forEach((file) => {
                FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${file}`, {
                  idempotent: true,
                }).catch(() => {});
              });
            })
            .catch(() => {});
        }
      };
    }, []);

    // Exposición de métodos al padre
    useImperativeHandle(ref, () => ({
      getSelectedFiles: () => selectedFiles,
      clearSelection: () => {
        setSelectedFiles([]);
        onFilesSelected?.([]);
      },
    }));

    const openMediaSelector = () => {
      setShowSourceModal(true);
    };

    const selectFromGallery = async () => {
      setShowSourceModal(false);
      try {
        setIsProcessing(true);

        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== "granted") {
          setIsProcessing(false);
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
          allowsEditing: false,
          preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
          ...(type === "photo" ? { quality: quality } : {}),
        };

        const result = await ImagePicker.launchImageLibraryAsync(options);

        if (!result.canceled && result.assets) {
          await processSelectedFiles(result.assets);
        }
      } catch (error) {
        console.error("Error selecting media:", error);
        Alert.alert(
          t("error", "Error"),
          t("mediaPickError", "Error al seleccionar archivos"),
          [{ text: t("ok", "OK") }]
        );
      } finally {
        setIsProcessing(false);
      }
    };

    const openCamera = () => {
      setShowSourceModal(false);
      setShowCamera(true);
    };

    const handleCameraCapture = async (uri: string) => {
      try {
        setIsProcessing(true);

        // Copiar archivo a almacenamiento persistente
        const fileName =
          type === "photo" ? `IMG_${Date.now()}` : `VID_${Date.now()}`;

        let persistentUri: string;
        try {
          persistentUri = await copyToPersistentStorage(uri, fileName);
        } catch (copyError) {
          console.error("Error copiando archivo:", copyError);
          // Si falla la copia, intentar usar el archivo original
          persistentUri = uri;
        }

        // Verificar el tamaño del archivo
        if (!persistentUri.startsWith("data:")) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(persistentUri);
            if (fileInfo.exists && "size" in fileInfo) {
              const sizeMB = fileInfo.size / (1024 * 1024);
              if (sizeMB > maxFileSize) {
                Alert.alert(
                  t("fileTooLarge", "Archivo muy grande"),
                  t(
                    "fileSizeWarning",
                    `El archivo excede el límite de ${maxFileSize}MB`
                  ),
                  [{ text: t("ok", "OK") }]
                );
                // Eliminar el archivo copiado si es muy grande
                if (persistentUri !== uri) {
                  await FileSystem.deleteAsync(persistentUri, {
                    idempotent: true,
                  });
                }
                return;
              }
            }
          } catch (error) {
            console.error("Error verificando tamaño:", error);
          }
        }

        const fullFileName =
          type === "photo" ? `${fileName}.jpg` : `${fileName}.mp4`;

        const newFile: MediaFile = {
          uri: persistentUri,
          fileName: fullFileName,
        };

        const updatedFiles = [...selectedFiles, newFile];
        setSelectedFiles(updatedFiles);
        onFilesSelected?.(updatedFiles);

        // Limpiar archivos antiguos (más de 7 días)
        cleanupOldFiles(7).catch(console.error);
      } catch (error) {
        console.error("Error processing camera capture:", error);
        Alert.alert(
          t("error", "Error"),
          t("processingError", "Error al procesar el archivo"),
          [{ text: t("ok", "OK") }]
        );
      } finally {
        setIsProcessing(false);
      }
    };

    const processSelectedFiles = async (
      assets: ImagePicker.ImagePickerAsset[]
    ) => {
      const newFiles: MediaFile[] = [];

      if (selectedFiles.length + assets.length > maxFiles) {
        Alert.alert(
          t("limitExceeded", "Límite excedido"),
          t("maxFilesMessage", `Máximo ${maxFiles} archivos permitidos`),
          [{ text: t("ok", "OK") }]
        );
        return;
      }

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];

        if (type === "photo" && !asset.uri.startsWith("data:")) {
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
          } catch (error) {
            console.error("Error verificando tamaño:", error);
          }
        }

        const fileName =
          type === "photo"
            ? `IMG_${Date.now()}_${newFiles.length}.jpg`
            : `VID_${Date.now()}_${newFiles.length}.mp4`;

        newFiles.push({
          uri: asset.uri,
          fileName,
        });
      }

      const updatedFiles = [...selectedFiles, ...newFiles];
      setSelectedFiles(updatedFiles);
      onFilesSelected?.(updatedFiles);
    };

    const removeFile = (index: number) => {
      const fileToRemove = selectedFiles[index];

      // Si es un archivo existente (de la base de datos), notificar al padre
      if (fileToRemove?.isExisting && onFileRemoved) {
        onFileRemoved(fileToRemove);
      }

      const updatedFiles = selectedFiles.filter((_, i) => i !== index);
      setSelectedFiles(updatedFiles);
      onFilesSelected?.(updatedFiles);
    };

    const getButtonText = () => {
      if (isProcessing) {
        if (type === "video") {
          return t("selectingVideo", "Seleccionando video...");
        } else {
          return t("selectingPhotos", "Seleccionando fotos...");
        }
      }

      if (selectedFiles.length > 0) {
        if (type === "video") {
          return selectedFiles[0].fileName;
        } else {
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

    return (
      <StyledView>
        {/* Selector principal */}
        <StyledView className="flex-row">
          {tooltip ? (
            <CustomTooltip
              text={tooltip}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-[48px] h-[48px] bg-[#D4D4D4]/10 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                <Feather
                  name={type === "photo" ? "image" : "video"}
                  size={28}
                  color="white"
                />
              </StyledView>
            </CustomTooltip>
          ) : (
            <StyledView className="w-[48px] h-[48px] bg-[#D4D4D4]/10 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
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
                  : openMediaSelector
              }
              className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg px-3 h-[48px] border border-[#eafffb]/40 flex-row items-center justify-between"
            >
              <StyledView className="flex-1 flex-row items-center">
                <StyledText
                  className="text-white/70 flex-1"
                  style={{
                    fontFamily: fontNames.light,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                >
                  {getButtonText()}
                </StyledText>
                <StyledView className="flex-row items-center">
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : type === "video" && selectedFiles.length > 0 ? (
                    <Feather
                      name="x"
                      size={16}
                      color="#ef4444"
                      style={{ marginLeft: 4 }}
                    />
                  ) : (
                    <Feather name="upload" size={16} color="white" />
                  )}
                </StyledView>
              </StyledView>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>

        {/* Preview en estilo pills SOLO PARA FOTOS */}
        {type === "photo" && selectedFiles.length > 0 && (
          <StyledView style={{ marginBottom: 24, marginTop: 12, height: 44 }}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                alignItems: "center",
                height: 44,
              }}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              {selectedFiles.map((file, index) => (
                <TouchableOpacity
                  key={`${file.uri}_${index}`}
                  style={{
                    marginRight: index === selectedFiles.length - 1 ? 16 : 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(234, 255, 251, 0.4)',
                    borderRadius: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingLeft: 4,
                    paddingRight: 8,
                    paddingVertical: 4,
                    height: 36,
                  }}
                  activeOpacity={0.7}
                >
                  {/* Thumbnail */}
                  <Image
                    source={{ uri: file.uri }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      marginRight: 8
                    }}
                  />

                  {/* Nombre del archivo */}
                  <Text
                    numberOfLines={1}
                    style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: 14,
                      marginRight: 8,
                      fontFamily: fontNames.light,
                      includeFontPadding: false,
                      maxWidth: 120,
                    }}
                  >
                    {file.fileName}
                  </Text>

                  {/* Botón de eliminar */}
                  <TouchableOpacity
                    onPress={() => removeFile(index)}
                    style={{ padding: 4 }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="x" size={14} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </StyledView>
        )}

        {/* Modal de selección de fuente */}
        <MediaSourceModal
          visible={showSourceModal}
          onClose={() => setShowSourceModal(false)}
          onSelectGallery={selectFromGallery}
          onSelectCamera={openCamera}
          type={type}
        />

        {/* Vista de cámara */}
        <CameraScreen
          visible={showCamera}
          onClose={() => setShowCamera(false)}
          onCapture={handleCameraCapture}
          type={type}
          maxDuration={maxVideoDuration}
        />
      </StyledView>
    );
  }
);

MediaSelector.displayName = "MediaSelector";
