import * as FileSystem from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as VideoThumbnails from "expo-video-thumbnails";
import pako from "pako";
import { performanceOptimizer } from "./performanceOptimizer";

export interface CompressionResult {
  uri: string;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  algorithm: "jpeg" | "h264" | "gzip" | "none";
  wasCompressed: boolean;
}

export interface CompressionOptions {
  quality?: number; // 0-1 para imágenes
  maxWidth?: number;
  maxHeight?: number;
  forceCompress?: boolean;
}

export class CompressionService {
  private static instance: CompressionService;

  // Umbrales configurables
  private readonly MIN_COMPRESSION_BENEFIT = 0.2; // 20% mínimo de reducción
  private readonly IMAGE_SIZE_THRESHOLD = 1 * 1024 * 1024; // 1MB
  private readonly VIDEO_SIZE_THRESHOLD = 5 * 1024 * 1024; // 5MB
  private readonly DATA_SIZE_THRESHOLD = 100 * 1024; // 100KB

  // Configuración por defecto
  private readonly DEFAULT_IMAGE_QUALITY = 0.8;
  private readonly DEFAULT_MAX_DIMENSION = 1920;

  private constructor() {}

  static getInstance(): CompressionService {
    if (!CompressionService.instance) {
      CompressionService.instance = new CompressionService();
    }
    return CompressionService.instance;
  }

  /**
   * Comprimir archivo automáticamente basado en su tipo
   */
  async compressFile(
    uri: string,
    mimeType: string,
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    const originalSize =
      fileInfo.exists && "size" in fileInfo ? fileInfo.size : 0;

    // Decidir tipo de compresión basado en mimeType
    if (mimeType.startsWith("image/")) {
      return this.compressImage(uri, originalSize, options);
    } else if (mimeType.startsWith("video/")) {
      // Para videos en Expo, no podemos comprimir fácilmente
      // Retornamos sin comprimir por ahora
      return this.handleVideoWithoutCompression(uri, originalSize);
    } else if (this.shouldCompressData(mimeType, originalSize)) {
      return this.compressData(uri, originalSize, mimeType);
    }

    // No comprimir
    return {
      uri,
      originalSize,
      compressedSize: originalSize,
      ratio: 1,
      algorithm: "none",
      wasCompressed: false,
    };
  }

  /**
   * Comprimir imagen usando expo-image-manipulator
   */
  private async compressImage(
    uri: string,
    originalSize: number,
    options: CompressionOptions
  ): Promise<CompressionResult> {
    // NUEVA ESTRATEGIA: Comprimir según tamaño
    let quality = options.quality ?? 0.8;
    let maxDimension = options.maxWidth ?? 1920;

    // Ajustar agresivamente según tamaño
    if (originalSize > 4 * 1024 * 1024) {
      // > 4MB
      quality = 0.5; // Muy agresivo
      maxDimension = 1080;
    } else if (originalSize > 2 * 1024 * 1024) {
      // > 2MB
      quality = 0.6;
      maxDimension = 1280;
    } else if (originalSize > 1 * 1024 * 1024) {
      // > 1MB
      quality = 0.7;
      maxDimension = 1440;
    }

    try {
      // NO usar performanceOptimizer aquí - es overhead
      const compressed = await manipulateAsync(
        uri,
        [{ resize: { width: maxDimension } }],
        {
          compress: quality,
          format: SaveFormat.JPEG,
          base64: false,
        }
      );

      // Verificar tamaño rápidamente
      const compressedInfo = await FileSystem.getInfoAsync(compressed.uri);
      const compressedSize =
        compressedInfo.exists && "size" in compressedInfo
          ? compressedInfo.size
          : originalSize;

      const ratio = compressedSize / originalSize;
      
      return {
        uri: compressed.uri,
        originalSize,
        compressedSize,
        ratio,
        algorithm: "jpeg",
        wasCompressed: true,
      };
    } catch (error) {
      // Fallar rápido, usar original
      return {
        uri,
        originalSize,
        compressedSize: originalSize,
        ratio: 1,
        algorithm: "none",
        wasCompressed: false,
      };
    }
  }

  /**
   * Manejar videos sin compresión (limitación de Expo)
   */
  private async handleVideoWithoutCompression(
    uri: string,
    originalSize: number
  ): Promise<CompressionResult> {
    
    // Opcionalmente, podemos generar un thumbnail para preview
    try {
      const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(
        uri,
        {
          time: 1000, // 1 segundo
        }
      );
          } catch (error) {
          }

    return {
      uri,
      originalSize,
      compressedSize: originalSize,
      ratio: 1,
      algorithm: "none",
      wasCompressed: false,
    };
  }

  /**
   * Comprimir datos genéricos con gzip
   */
  private async compressData(
    uri: string,
    originalSize: number,
    mimeType: string
  ): Promise<CompressionResult> {
    try {
      
      // Leer archivo
      const data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Comprimir con pako
      const compressed = pako.gzip(data);

      // Guardar archivo comprimido
      const compressedUri = `${
        FileSystem.cacheDirectory
      }compressed_${Date.now()}.gz`;
      await FileSystem.writeAsStringAsync(
        compressedUri,
        Buffer.from(compressed).toString("base64"),
        { encoding: FileSystem.EncodingType.Base64 }
      );

      const compressedSize = compressed.length;
      const ratio = compressedSize / originalSize;
      const benefit = 1 - ratio;

      if (benefit < this.MIN_COMPRESSION_BENEFIT) {
        // Limpiar archivo temporal
        await FileSystem.deleteAsync(compressedUri, { idempotent: true });

        return {
          uri,
          originalSize,
          compressedSize: originalSize,
          ratio: 1,
          algorithm: "none",
          wasCompressed: false,
        };
      }

      
      return {
        uri: compressedUri,
        originalSize,
        compressedSize,
        ratio,
        algorithm: "gzip",
        wasCompressed: true,
      };
    } catch (error) {
      console.error("Error comprimiendo datos:", error);
      return {
        uri,
        originalSize,
        compressedSize: originalSize,
        ratio: 1,
        algorithm: "none",
        wasCompressed: false,
      };
    }
  }

  /**
   * Determinar si un archivo de datos debe comprimirse
   */
  private shouldCompressData(mimeType: string, size: number): boolean {
    // No comprimir archivos ya comprimidos
    const compressedTypes = [
      "application/zip",
      "application/x-rar",
      "application/x-7z-compressed",
      "application/gzip",
      "image/webp",
    ];

    if (compressedTypes.includes(mimeType)) {
      return false;
    }

    // Comprimir solo si es mayor al umbral
    return size > this.DATA_SIZE_THRESHOLD;
  }

  /**
   * Descomprimir archivo basado en algoritmo
   */
  async decompressFile(
    uri: string,
    algorithm: "jpeg" | "h264" | "gzip" | "none",
    originalName?: string
  ): Promise<string> {
    if (algorithm === "none" || algorithm === "jpeg" || algorithm === "h264") {
      // No necesita descompresión
      return uri;
    }

    if (algorithm === "gzip") {
      try {
        // Leer archivo comprimido
        const compressedData = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Descomprimir
        const compressed = Buffer.from(compressedData, "base64");
        const decompressed = pako.ungzip(compressed, { to: "string" });

        // Guardar archivo descomprimido
        const decompressedUri = `${FileSystem.cacheDirectory}${
          originalName || `decompressed_${Date.now()}.txt`
        }`;
        await FileSystem.writeAsStringAsync(decompressedUri, decompressed);

        return decompressedUri;
      } catch (error) {
        console.error("Error descomprimiendo archivo:", error);
        throw error;
      }
    }

    return uri;
  }

  /**
   * Limpiar archivos temporales de compresión
   */
  async cleanupTemporaryFiles(): Promise<void> {
    try {
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) return;

      const files = await FileSystem.readDirectoryAsync(cacheDir);
      const compressionFiles = files.filter(
        (f) => f.startsWith("compressed_") || f.startsWith("decompressed_")
      );

      await Promise.all(
        compressionFiles.map((file) =>
          FileSystem.deleteAsync(`${cacheDir}${file}`, { idempotent: true })
        )
      );

          } catch (error) {
      console.error("Error limpiando archivos temporales:", error);
    }
  }

  /**
   * Obtener estadísticas de compresión
   */
  getCompressionStats() {
    return {
      imageCompression:
        performanceOptimizer.getAverageMetrics("image-compression"),
      videoCompression: { avgDuration: 0, avgSize: 0, avgSpeed: 0, count: 0 }, // No disponible en Expo
      dataCompression:
        performanceOptimizer.getAverageMetrics("data-compression"),
    };
  }
}

// Exportar instancia singleton
export const compressionService = CompressionService.getInstance();
