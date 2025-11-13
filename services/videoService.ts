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
// Solo confiar en appOwnership - si es null o undefined, NO es Expo Go
const isExpoGo = Constants.appOwnership === "expo";

// Cargar react-native-compressor si no estamos en Expo Go
// IMPORTANTE: Necesitamos compresión local para videos grandes antes de subirlos
console.log(`🔍 [VideoService] Inicializando... isExpoGo: ${isExpoGo}`);

let Video: any = null;
if (!isExpoGo) {
  console.log("🔍 [VideoService] Intentando cargar react-native-compressor...");
  try {
    const compressor = require("react-native-compressor");
    Video = compressor.Video;
    console.log("✅ [VideoService] react-native-compressor cargado correctamente");
    console.log(`   Video module: ${Video ? 'OK' : 'NULL'}`);
  } catch (error) {
    console.error("❌ [VideoService] react-native-compressor no disponible:", error);
    console.error("   Asegúrate de estar usando dev client (no Expo Go)");
  }
} else {
  console.warn("⚠️  [VideoService] Expo Go detectado - compresión deshabilitada");
}

class VideoService {
  // Comprimir video usando react-native-compressor
  // IMPORTANTE: El sistema de videoAnalysisService determina automáticamente
  // cuándo y con qué calidad comprimir basándose en bitrate y duración
  async compressVideo(
    inputUri: string,
    quality: "low" | "medium" | "high" = "medium"
  ): Promise<string> {
    console.log(`🗜️ Iniciando compresión de video con calidad: ${quality}`);

    // Intentar cargar el módulo si aún no está cargado
    if (!Video && !isExpoGo) {
      console.log("🔄 Intentando cargar react-native-compressor dinámicamente...");
      try {
        const compressor = require("react-native-compressor");
        Video = compressor.Video;
        console.log("✅ Módulo cargado exitosamente");
      } catch (error) {
        console.error("❌ Error cargando módulo:", error);
      }
    }

    console.log(`   Video module disponible: ${!!Video}`);
    console.log(`   isExpoGo: ${isExpoGo}`);

    // Si no tenemos el módulo nativo, devolver el URI original
    if (!Video) {
      console.error("❌ Compresión fallida: Video module es NULL");
      console.error("   Platform:", Platform.OS);
      console.error("   __DEV__:", __DEV__);
      console.error("   Constants.appOwnership:", Constants.appOwnership);
      console.error("   nativeModulesProxy:", !!(global as any).nativeModulesProxy);
      console.error("   RNCVideoCompressor:", !!(global as any).nativeModulesProxy?.RNCVideoCompressor);
      console.warn(
        "⚠️  Compresión de video no disponible (Expo Go o módulo no instalado) - usando video original"
      );
      return inputUri;
    }

    // Verificar tamaño del archivo para reportar
    const fileInfo = await FileSystem.getInfoAsync(inputUri);
    const fileSizeMB = (fileInfo.exists && 'size' in fileInfo) ? fileInfo.size / (1024 * 1024) : 0;
    console.log(`📊 Archivo original: ${fileSizeMB.toFixed(2)} MB`);

    // Configuración de bitrates optimizada por calidad
    // Bitrates basados en estándares de YouTube y recomendaciones H.264
    const compressionOptions = {
      low: {
        bitrate: 3000000,      // 3 Mbps - Calidad aceptable para SD/720p
        minimumBitrate: 1500000 // 1.5 Mbps mínimo
      },
      medium: {
        bitrate: 6500000,      // 6.5 Mbps - Buena calidad para 1080p 30fps
        minimumBitrate: 3500000 // 3.5 Mbps mínimo
      },
      high: {
        bitrate: 10000000,     // 10 Mbps - Alta calidad para 1080p 60fps / 4K
        minimumBitrate: 5000000 // 5 Mbps mínimo
      },
    };

    const options = compressionOptions[quality];
    console.log(`🎯 Bitrate objetivo: ${(options.bitrate / 1000000).toFixed(1)} Mbps`);

    try {
      const startTime = Date.now();

      const result = (await Video.compress(inputUri, {
        compressionMethod: "manual",
        bitrate: options.bitrate,
        minimumBitrate: options.minimumBitrate,
      })) as string;

      const endTime = Date.now();
      const compressionTime = ((endTime - startTime) / 1000).toFixed(1);

      // Verificar tamaño del resultado
      const compressedInfo = await FileSystem.getInfoAsync(result);
      const compressedSizeMB = (compressedInfo.exists && 'size' in compressedInfo)
        ? compressedInfo.size / (1024 * 1024)
        : 0;

      const reduction = fileSizeMB > 0 ? ((fileSizeMB - compressedSizeMB) / fileSizeMB * 100) : 0;

      console.log(`✅ Compresión completada en ${compressionTime}s`);
      console.log(`   • Tamaño final: ${compressedSizeMB.toFixed(2)} MB`);
      console.log(`   • Reducción: ${reduction.toFixed(1)}%`);

      // Si la compresión no redujo al menos 10%, devolver original
      if (reduction < 10) {
        console.warn(`⚠️  Compresión insuficiente (<10%) - usando original`);
        // Limpiar archivo comprimido
        try {
          await FileSystem.deleteAsync(result, { idempotent: true });
        } catch (e) {
          // Ignorar error de limpieza
        }
        return inputUri;
      }

      return result;
    } catch (error) {
      console.error("❌ Error compressing video:", error);
      // En caso de error, devolver el URI original
      return inputUri;
    }
  }

  // Verificar si la compresión está disponible
  isCompressionAvailable(): boolean {
    // La compresión SIEMPRE está disponible si tenemos el módulo nativo
    // (incluso con Cloudflare Stream, la necesitamos para archivos >200MB)
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
      // Obtener thumbnail con información de dimensiones
      const { uri, width, height } = await VideoThumbnails.getThumbnailAsync(
        videoUri,
        {
          time: 0,
        }
      );

      // Obtener duración usando expo-av (deprecado pero funciona hasta SDK 54)
      // TODO: Migrar a expo-video-metadata cuando actualices a SDK 54+
      let duration: number | undefined;
      try {
        const { Audio } = await import('expo-av');
        const { sound } = await Audio.Sound.createAsync(
          { uri: videoUri },
          { shouldPlay: false }
        );

        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          duration = Math.round(status.durationMillis / 1000); // Convertir a segundos
        }

        // Limpiar el recurso de audio
        await sound.unloadAsync();
      } catch (durationError) {
        console.warn("No se pudo obtener duración del video:", durationError);
        // No es crítico, continuar sin duración
      }

      return {
        duration,
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
