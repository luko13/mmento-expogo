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
} from "react-native";
import { styled } from "nativewind";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import CustomTooltip from "../ui/Tooltip";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledImage = styled(Image);

interface MediaFile {
  uri: string;
  fileName: string;
}

interface MediaSelectorProps {
  type: "photo" | "video";
  multiple?: boolean;
  maxFiles?: number;
  maxFileSize?: number; // en MB
  quality?: number;
  onFilesSelected?: (files: MediaFile[]) => void;
  tooltip?: string;
  placeholder?: string;
  disableEncryption?: boolean; // Mantenemos por compatibilidad pero no se usa
}

export interface MediaSelectorRef {
  getSelectedFiles: () => MediaFile[];
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
      tooltip,
      placeholder,
    } = props;

    const { t } = useTranslation();
    const [selectedFiles, setSelectedFiles] = useState<MediaFile[]>([]);

    // Exposición de métodos al padre
    useImperativeHandle(ref, () => ({
      getSelectedFiles: () => selectedFiles,
      clearSelection: () => {
        setSelectedFiles([]);
        onFilesSelected?.([]);
      },
    }));

    const selectMedia = async () => {
      try {
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
              } catch (error) {
                console.error("Error verificando tamaño:", error);
              }
            }

            // Generar nombre de archivo
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
      const updatedFiles = selectedFiles.filter((_, i) => i !== index);
      setSelectedFiles(updatedFiles);
      onFilesSelected?.(updatedFiles);
    };

    const getButtonText = () => {
      if (selectedFiles.length > 0) {
        if (type === "video") {
          // Para videos, mostrar el nombre del archivo
          return selectedFiles[0].fileName;
        } else {
          // Para fotos, mostrar cantidad
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
                    <Feather name="upload" size={16} color="white" />
                  )}
                </StyledView>
              </StyledView>
            </StyledTouchableOpacity>
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
                  key={`${file.uri}_${index}`}
                  className="mr-2 bg-white/5 border border-emerald-500/20 rounded-full flex-row items-center px-2 py-1"
                >
                  {/* Thumbnail */}
                  <StyledView className="relative">
                    <StyledImage
                      source={{ uri: file.uri }}
                      className="w-6 h-6 rounded-full mr-2"
                    />
                  </StyledView>

                  {/* Nombre del archivo */}
                  <StyledText
                    className="text-white/50 text-xs mr-2"
                    numberOfLines={1}
                  >
                    {file.fileName}
                  </StyledText>

                  {/* Botón de eliminar */}
                  <StyledTouchableOpacity
                    onPress={() => removeFile(index)}
                    className="p-1"
                  >
                    <Feather name="x" size={12} color="rgba(255,255,255,0.5)" />
                  </StyledTouchableOpacity>
                </StyledView>
              ))}
            </StyledScrollView>
          </StyledView>
        )}
      </StyledView>
    );
  }
);

MediaSelector.displayName = "MediaSelector";
