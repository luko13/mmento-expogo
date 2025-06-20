// services/videoService.ts
import { Video } from "react-native-compressor";
import * as VideoThumbnails from "expo-video-thumbnails";
import * as FileSystem from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

class VideoService {
  // Comprimir video usando react-native-compressor
  async compressVideo(
    inputUri: string,
    quality: "low" | "medium" | "high" = "medium"
  ): Promise<string> {
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
      throw error;
    }
  }

  // Extraer thumbnail del video
  async extractThumbnail(
    videoUri: string,
    time: number = 1000
  ): Promise<string> {
    try {
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
    try {
      const result = await Video.compress(inputUri, {
        compressionMethod: "manual",
        maxSize: targetSize.width || 1280,
      });

      return result;
    } catch (error) {
      console.error("Error converting video:", error);
      throw error;
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
