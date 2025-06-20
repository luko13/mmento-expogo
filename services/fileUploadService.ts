// services/fileUploadService.ts
import { Platform, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { decode } from 'base64-arraybuffer';
import { supabase } from "../lib/supabase";
import * as VideoThumbnails from "expo-video-thumbnails";
import { compressionService } from "../utils/compressionService";

// Bucket constante
export const STORAGE_BUCKET = "magic_trick_media";

// Tipos de medios
export type MediaType = "video" | "image";

// Límites de tamaño en MB
export const FILE_SIZE_LIMITS = {
  VIDEO_SMALL: 5,  // Límite para subida directa en la app (MB)
  VIDEO_LARGE: 50, // Límite máximo para videos (MB)
  IMAGE_SMALL: 2,  // Límite para imágenes sin compresión obligatoria (MB)
  IMAGE_LARGE: 10  // Límite máximo para imágenes (MB)
};

// Interfaz para resultado de subida
export interface UploadResult {
  url: string;
  originalSize: number;
  compressedSize?: number;
  compressionRatio?: number;
  wasCompressed: boolean;
}

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

// Subir archivo a Supabase utilizando método directo
export const uploadFileDirectly = async (
  uri: string,
  userId: string,
  folder: string,
  fileType: string,
  fileName: string
): Promise<string | null> => {
  try {
    // Generar nombre único
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const extension = fileName.split('.').pop() || 'bin';
    const storagePath = `${folder}/${timestamp}_${randomStr}.${extension}`;

    console.log(`📤 Subiendo archivo directamente: ${storagePath}`);

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

    console.log(`✅ Archivo subido: ${publicURL.publicUrl}`);
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
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const extension = fileName.split('.').pop() || 'bin';
    const storagePath = `${folder}/${timestamp}_${randomStr}.${extension}`;
    
    console.log(`📤 Subiendo archivo por streaming: ${storagePath}`);
    
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

    console.log(`✅ Archivo subido por streaming: ${publicURL.publicUrl}`);
    return publicURL.publicUrl;
  } catch (error) {
    console.error("Error en uploadFileStreaming:", error);
    return null;
  }
};

// Función unificada para subir archivos con compresión automática
export const uploadFileToStorage = async (
  uri: string,
  userId: string,
  folder: string,
  fileType: string,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<string | null> => {
  try {
    console.log(`🚀 Iniciando subida de archivo: ${fileName}`);
    
    // Obtener información del archivo
    const fileInfo = await getFileInfo(uri);
    console.log(`📊 Tamaño original: ${fileInfo.size.toFixed(2)} MB`);
    
    // Comprimir el archivo si es necesario
    let fileToUpload = uri;
    let wasCompressed = false;
    
    // Determinar si necesita compresión basado en el tipo y tamaño
    const shouldCompress = (fileType.startsWith('image/') && fileInfo.size > FILE_SIZE_LIMITS.IMAGE_SMALL) ||
                          (fileType.startsWith('video/') && fileInfo.size > FILE_SIZE_LIMITS.VIDEO_SMALL);
    
    if (shouldCompress) {
      console.log(`🗜️ Comprimiendo archivo...`);
      
      const compressionResult = await compressionService.compressFile(
        uri,
        fileType,
        {
          quality: fileType.startsWith('image/') ? 0.7 : undefined,
          maxWidth: fileType.startsWith('image/') ? 1920 : undefined,
          forceCompress: true
        }
      );
      
      if (compressionResult.wasCompressed) {
        fileToUpload = compressionResult.uri;
        wasCompressed = true;
        
        const compressedInfo = await getFileInfo(fileToUpload);
        console.log(`✅ Compresión completada:`);
        console.log(`   - Tamaño original: ${fileInfo.size.toFixed(2)} MB`);
        console.log(`   - Tamaño comprimido: ${compressedInfo.size.toFixed(2)} MB`);
        console.log(`   - Reducción: ${((1 - compressionResult.ratio) * 100).toFixed(1)}%`);
      } else {
        console.log(`ℹ️ No se aplicó compresión (beneficio insuficiente)`);
      }
    }
    
    // Elegir el método de subida adecuado
    let uploadUrl: string | null = null;
    
    if (fileType.startsWith('video/') && fileInfo.size > FILE_SIZE_LIMITS.VIDEO_SMALL) {
      // Para videos grandes, usar streaming con progreso
      console.log(`📹 Subiendo video grande con streaming...`);
      uploadUrl = await uploadFileStreaming(
        fileToUpload, 
        userId, 
        folder, 
        fileType, 
        fileName, 
        onProgress
      );
    } else {
      // Para archivos pequeños, usar el método directo
      console.log(`📎 Subiendo archivo directamente...`);
      uploadUrl = await uploadFileDirectly(
        fileToUpload, 
        userId, 
        folder, 
        fileType, 
        fileName
      );
    }
    
    // Limpiar archivo temporal si fue comprimido
    if (wasCompressed && fileToUpload !== uri) {
      try {
        await FileSystem.deleteAsync(fileToUpload, { idempotent: true });
        console.log(`🧹 Archivo temporal eliminado`);
      } catch (error) {
        console.warn("No se pudo eliminar archivo temporal:", error);
      }
    }
    
    return uploadUrl;
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

// Eliminar archivo de Supabase
export const deleteFileFromStorage = async (
  fileUrl: string
): Promise<boolean> => {
  try {
    if (!fileUrl || !fileUrl.includes(STORAGE_BUCKET)) {
      console.warn("URL de archivo inválida para eliminar:", fileUrl);
      return false;
    }
    
    // Extraer la ruta del archivo de la URL
    const urlParts = fileUrl.split(`${STORAGE_BUCKET}/`);
    if (urlParts.length < 2) {
      console.error("No se pudo extraer la ruta del archivo de la URL");
      return false;
    }
    
    const filePath = urlParts[1].split('?')[0]; // Remover query params si existen
    
    console.log(`🗑️ Eliminando archivo: ${filePath}`);
    
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);
    
    if (error) {
      console.error("Error eliminando archivo:", error);
      return false;
    }
    
    console.log(`✅ Archivo eliminado exitosamente`);
    return true;
  } catch (error) {
    console.error("Error en deleteFileFromStorage:", error);
    return false;
  }
};

// Obtener estadísticas de almacenamiento del usuario
export const getUserStorageStats = async (
  userId: string
): Promise<{
  totalFiles: number;
  totalSize: number;
  totalSizeMB: number;
  byType: {
    images: { count: number; size: number };
    videos: { count: number; size: number };
  };
} | null> => {
  try {
    // Esta es una implementación simplificada
    // En producción, deberías mantener un registro de los archivos subidos
    // en una tabla de base de datos para obtener estadísticas precisas
    
    console.log("📊 Obteniendo estadísticas de almacenamiento para:", userId);
    
    // Por ahora, retornamos valores por defecto
    return {
      totalFiles: 0,
      totalSize: 0,
      totalSizeMB: 0,
      byType: {
        images: { count: 0, size: 0 },
        videos: { count: 0, size: 0 }
      }
    };
  } catch (error) {
    console.error("Error obteniendo estadísticas de almacenamiento:", error);
    return null;
  }
};