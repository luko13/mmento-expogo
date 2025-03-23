import { Platform, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { decode } from 'base64-arraybuffer'; // Para convertir de Base64 a ArrayBuffer
import { supabase } from "../lib/supabase";
import * as VideoThumbnails from "expo-video-thumbnails";
import * as ImageManipulator from 'expo-image-manipulator';

// Bucket constante
export const STORAGE_BUCKET = "magic_trick_media";

// Tipos de medios
export type MediaType = "video" | "image";

// Límites de tamaño en MB
export const FILE_SIZE_LIMITS = {
  VIDEO_SMALL: 5, // Límite para subida directa en la app (MB)
  VIDEO_LARGE: 50, // Límite para subida mediante URL (MB)
  IMAGE_SMALL: 2, // Límite para subida directa sin compresión (MB)
  IMAGE_LARGE: 10 // Límite para compresión o subida externa (MB)
};

// Solicitar permisos de biblioteca de medios
export const requestMediaLibraryPermissions = async (
  mediaType: MediaType,
  t: (key: string, fallback: string) => string
): Promise<boolean> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        t("permissionRequired", "Permiso Requerido"),
        t(
          "mediaLibraryPermission",
          `Necesitamos acceso a tu biblioteca multimedia para subir ${mediaType === 'video' ? 'videos' : 'imágenes'}.`
        ),
        [{ text: t("ok", "Aceptar") }]
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Error requesting permissions:`, error);
    return false;
  }
};

// Obtener información del archivo
export const getFileInfo = async (
  uri: string
): Promise<{ exists: boolean; size: number; uri: string }> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists && "size" in fileInfo) {
      return {
        exists: fileInfo.exists,
        size: fileInfo.size / (1024 * 1024), // Convertir a MB
        uri
      };
    }
    return { exists: false, size: 0, uri };
  } catch (error) {
    console.error("Error getting file info:", error);
    return { exists: false, size: 0, uri };
  }
};

// Crear una URL prefirmada para subida directa desde navegador
export const createPresignedUrl = async (
  userId: string,
  folder: string,
  fileExtension: string = "mp4"
): Promise<{ signedUrl: string; fileUrl: string } | null> => {
  try {
    // Generar un nombre único de archivo
    const fileName = `${folder}/${Date.now()}_${userId.substring(
      0,
      8
    )}.${fileExtension}`;

    // Obtener URL firmada para subida directa
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(fileName);

    if (error || !data) {
      console.error("Error creando URL firmada:", error);
      return null;
    }

    // URL para abrir en el navegador y URL del archivo después de subido
    const signedUrl = data.signedUrl;
    const fileUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${fileName}`;

    return { signedUrl, fileUrl };
  } catch (error) {
    console.error("Error en createPresignedUrl:", error);
    return null;
  }
};

// Comprimir imagen antes de subir
export const compressImage = async (
  uri: string,
  quality: number = 0.7,
  maxWidth: number = 1280
): Promise<string> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (error) {
    console.error("Error comprimiendo imagen:", error);
    return uri; // Devuelve la URI original si hay error
  }
};

// Subir archivo a Supabase utilizando método directo (para archivos pequeños)
export const uploadFileDirectly = async (
  uri: string,
  userId: string,
  folder: string,
  fileType: string,
  fileName: string
): Promise<string | null> => {
  try {
    // Generar nombre único
    const storagePath = `${folder}/${Date.now()}_${userId.substring(0, 8)}_${fileName}`;

    // En iOS, necesitamos convertir a Base64 y luego a ArrayBuffer
    if (Platform.OS === "ios") {
      try {
        const base64Data = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64
        });

        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, decode(base64Data), {
            contentType: fileType,
            upsert: true
          });

        if (error) {
          console.error("Error subiendo archivo (iOS):", error);
          return null;
        }
      } catch (error) {
        console.error("Error leyendo archivo (iOS):", error);
        return null;
      }
    } else {
      // Para Android, convertimos a Blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, blob, {
          contentType: fileType,
          upsert: true
        });

      if (error) {
        console.error("Error subiendo archivo (Android):", error);
        return null;
      }
    }

    // Obtener URL pública
    const { data: publicURL } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    return publicURL.publicUrl;
  } catch (error) {
    console.error("Error en uploadFileDirectly:", error);
    return null;
  }
};

// Subir archivo grande utilizando streaming (más eficiente para videos)
export const uploadFileStreaming = async (
    uri: string,
    userId: string,
    folder: string,
    fileType: string,
    fileName: string,
    onProgress?: (progress: number) => void
  ): Promise<string | null> => {
    try {
      // Generar nombre único
      const storagePath = `${folder}/${Date.now()}_${userId.substring(0, 8)}_${fileName}`;
      
      // Obtener token de autenticación
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        console.error("No se encontró token de autenticación");
        return null;
      }
  
      // Endpoint para subida directa
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${storagePath}`;
      
      // Configurar encabezados de autenticación
      const headers = {
        "Content-Type": fileType,
        "Authorization": `Bearer ${token}`,
        "apikey": process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
      };
  
      let uploadSuccessful = false;
  
      // Si se proporciona callback de progreso, usar createUploadTask
      if (onProgress) {
        const uploadTask = FileSystem.createUploadTask(
          uploadUrl,
          uri,
          {
            httpMethod: 'POST',
            headers,
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT
          },
          (progress) => {
            const percentage = (progress.totalBytesSent / progress.totalBytesExpectedToSend) * 100;
            onProgress(percentage);
          }
        );
        
        const uploadResponse = await uploadTask.uploadAsync();
        
        if (uploadResponse && uploadResponse.status === 200) {
          uploadSuccessful = true;
        } else {
          console.error("Error en la subida por streaming:", uploadResponse?.status || "Sin respuesta");
        }
      } else {
        // Sin seguimiento de progreso
        const uploadResponse = await FileSystem.uploadAsync(
          uploadUrl,
          uri,
          {
            httpMethod: 'POST',
            headers,
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT
          }
        );
        
        if (uploadResponse && uploadResponse.status === 200) {
          uploadSuccessful = true;
        } else {
          console.error("Error en la subida por streaming:", uploadResponse?.status || "Sin respuesta");
        }
      }
  
      if (!uploadSuccessful) {
        return null;
      }
  
      // Obtener URL pública
      const { data: publicURL } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);
  
      return publicURL.publicUrl;
    } catch (error) {
      console.error("Error en uploadFileStreaming:", error);
      return null;
    }
  }

// Función unificada para subir archivos, elige el mejor método automáticamente
export const uploadFileToStorage = async (
  uri: string,
  userId: string,
  folder: string,
  fileType: string,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<string | null> => {
  try {
    // Obtener información del archivo
    const fileInfo = await getFileInfo(uri);
    
    // Comprimir imagen si es necesario
    if (fileType.startsWith('image/') && fileInfo.size > FILE_SIZE_LIMITS.IMAGE_SMALL) {
      // Calcular calidad de compresión en base al tamaño
      const quality = Math.min(0.9, FILE_SIZE_LIMITS.IMAGE_SMALL / fileInfo.size);
      uri = await compressImage(uri, quality);
      
      // Verificar tamaño después de comprimir
      const compressedInfo = await getFileInfo(uri);
      console.log(`Imagen comprimida: ${fileInfo.size.toFixed(2)}MB -> ${compressedInfo.size.toFixed(2)}MB`);
    }
    
    // Elegir el método de subida adecuado
    if (fileType.startsWith('video/') && fileInfo.size > FILE_SIZE_LIMITS.VIDEO_SMALL) {
      // Para videos grandes, usar streaming con progreso
      return uploadFileStreaming(uri, userId, folder, fileType, fileName, onProgress);
    } else {
      // Para archivos pequeños, usar el método directo
      return uploadFileDirectly(uri, userId, folder, fileType, fileName);
    }
  } catch (error) {
    console.error("Error en uploadFileToStorage:", error);
    return null;
  }
};

// Generar miniatura de video
export const generateVideoThumbnail = async (
  videoUri: string
): Promise<string | null> => {
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: 1000, // 1 segundo
      quality: 0.5
    });
    return uri;
  } catch (error) {
    console.error("Error generando miniatura:", error);
    return null;
  }
};