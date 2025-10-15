// services/videoService.ts
import * as VideoThumbnails from "expo-video-thumbnails";
import * as FileSystem from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import Constants from "expo-constants";
import { Platform } from "react-native";
import CloudflareStreamService from "./cloudflare/CloudflareStreamService";

// Flag para usar Cloudflare Stream (no necesita compresión local)
const USE_CLOUDFLARE_STREAM = true;

// Detectar si estamos en Expo Go
const isExpoGo =
  Constants.appOwnership === "expo" ||
  (Platform.OS === "ios" &&
    __DEV__ &&
    !(global as any).nativeModulesProxy?.RNCVideoCompressor);

// Intentar cargar react-native-compressor solo si no estamos en Expo Go
// NOTA: Con Cloudflare Stream esto ya no es necesario
let Video: any = null;
if (!isExpoGo && !USE_CLOUDFLARE_STREAM) {
  import("react-native-compressor")
    .then((module) => {
      Video = module.Video;
    })
    .catch(() => {
      console.log("react-native-compressor no disponible");
    });
}

class VideoService {
  // Comprimir video usando react-native-compressor o fallback
  // NOTA: Con Cloudflare Stream, la compresión local ya no es necesaria
  async compressVideo(
    inputUri: string,
    quality: "low" | "medium" | "high" = "medium"
  ): Promise<string> {
    // Si usamos Cloudflare Stream, no comprimimos localmente
    if (USE_CLOUDFLARE_STREAM) {
      console.log("ℹ️ Cloudflare Stream habilitado - compresión local omitida");
      return inputUri;
    }

    // Si no tenemos el módulo nativo, devolver el URI original
    if (!Video) {
      console.warn(
        "Compresión de video no disponible en Expo Go - usando video original"
      );
      return inputUri;
    }

    const compressionOptions = {
      low: { bitrate: 2000000, minimumBitrate: 1000000 }, // 2 Mbps
      medium: { bitrate: 3500000, minimumBitrate: 2000000 }, // 3.5 Mbps
      high: { bitrate: 5000000, minimumBitrate: 3000000 }, // 5 Mbps
    };

    const options = compressionOptions[quality];

    try {
      const result = (await Video.compress(inputUri, {
        compressionMethod: "manual",
        bitrate: options.bitrate,
        minimumBitrate: options.minimumBitrate,
      })) as string;

      return result;
    } catch (error) {
      console.error("Error compressing video:", error);
      // En caso de error, devolver el URI original
      return inputUri;
    }
  }

  // Verificar si la compresión está disponible
  isCompressionAvailable(): boolean {
    // Si usamos Cloudflare Stream, no necesitamos compresión local
    if (USE_CLOUDFLARE_STREAM) {
      return false; // No disponible porque no es necesaria
    }
    return !!Video;
  }

  // Extraer thumbnail del video
  // NOTA: Con Cloudflare Stream, los thumbnails se generan automáticamente
  async extractThumbnail(
    videoUri: string,
    time: number = 1000
  ): Promise<string> {
    try {
      // Si es una URL de Cloudflare Stream, extraer el video ID y obtener thumbnail
      if (USE_CLOUDFLARE_STREAM && videoUri.includes('cloudflarestream.com')) {
        const videoId = CloudflareStreamService.extractVideoId(videoUri);
        if (videoId) {
          // Cloudflare Stream genera thumbnails automáticamente
          const thumbnailUrl = CloudflareStreamService.getThumbnailUrl(videoId, {
            time: `${Math.floor(time / 1000)}s`, // convertir ms a segundos
          });
          console.log('✅ Usando thumbnail de Cloudflare Stream');
          return thumbnailUrl;
        }
      }

      // Fallback a generación local
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time, // en milisegundos
        quality: 1.0,
      });

      return uri;
    } catch (error) {
      console.error("Error extracting thumbnail:", error);
      throw error;
    }
  }

  // Obtener información del video (duración, dimensiones)
  async getVideoInfo(videoUri: string): Promise<{
    duration?: number;
    width?: number;
    height?: number;
    thumbnail?: string;
  }> {
    try {
      // Obtener thumbnail con información
      const { uri, width, height } = await VideoThumbnails.getThumbnailAsync(
        videoUri,
        {
          time: 0,
        }
      );

      // Para la duración, necesitarías expo-av
      // import { AVPlaybackStatus } from 'expo-av';
      // const { sound } = await Audio.Sound.createAsync({ uri: videoUri });
      // const status = await sound.getStatusAsync();

      return {
        width,
        height,
        thumbnail: uri,
      };
    } catch (error) {
      console.error("Error getting video info:", error);
      throw error;
    }
  }

  // Añadir watermark usando manipulación de imágenes
  async addWatermarkToThumbnail(
    thumbnailUri: string,
    watermarkUri: string
  ): Promise<string> {
    try {
      // Esto solo añade watermark a una imagen, no al video
      const manipulatedImage = await manipulateAsync(thumbnailUri, [], {
        compress: 0.9,
        format: SaveFormat.PNG,
      });

      // Para watermark real en videos, necesitas servicios externos
      console.warn(
        "Real video watermarking requires cloud services or native modules"
      );

      return manipulatedImage.uri;
    } catch (error) {
      console.error("Error adding watermark:", error);
      throw error;
    }
  }

  // Convertir video a diferentes calidades/formatos
  async convertVideoQuality(
    inputUri: string,
    targetSize: { width?: number; height?: number }
  ): Promise<string> {
    if (!Video) {
      console.warn("Conversión de video no disponible en Expo Go");
      return inputUri;
    }

    try {
      const result = await Video.compress(inputUri, {
        compressionMethod: "manual",
        maxSize: targetSize.width || 1280,
      });

      return result;
    } catch (error) {
      console.error("Error converting video:", error);
      return inputUri;
    }
  }

  // Guardar video en el sistema de archivos
  async saveVideoToFileSystem(
    videoUri: string,
    filename: string
  ): Promise<string> {
    try {
      const directory = `${FileSystem.documentDirectory}videos/`;

      // Crear directorio si no existe
      const dirInfo = await FileSystem.getInfoAsync(directory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      }

      const fileUri = `${directory}${filename}`;
      await FileSystem.copyAsync({
        from: videoUri,
        to: fileUri,
      });

      return fileUri;
    } catch (error) {
      console.error("Error saving video:", error);
      throw error;
    }
  }

  // Para operaciones avanzadas, usa servicios cloud
  async processVideoAdvanced(
    videoUri: string,
    operations: any
  ): Promise<string> {
    // Opciones de servicios cloud:
    // 1. Cloudinary
    // 2. AWS MediaConvert
    // 3. Azure Media Services
    // 4. Mux

    console.warn("Advanced video processing requires cloud services");

    // Ejemplo con Cloudinary (necesitas configurar API):
    // const formData = new FormData();
    // formData.append('file', videoUri);
    // formData.append('upload_preset', 'your_preset');
    //
    // const response = await fetch('https://api.cloudinary.com/v1_1/your_cloud/video/upload', {
    //   method: 'POST',
    //   body: formData,
    // });

    return videoUri;
  }
}

export default new VideoService();
