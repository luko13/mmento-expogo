// services/videoAnalysisService.ts
import * as FileSystem from "expo-file-system";
import videoService from "./videoService";

/**
 * Servicio de análisis inteligente de videos
 * Determina automáticamente si un video necesita compresión
 * basándose en múltiples factores: duración, tamaño, resolución, bitrate
 */

// Constantes basadas en estándares de la industria y mejores prácticas
export const VIDEO_STANDARDS = {
  // Límites de duración
  MAX_DURATION_SECONDS: 600, // 10 minutos máximo

  // Bitrate máximo recomendado por resolución (Mbps)
  // Fuente: Recomendaciones de YouTube, Vimeo, y estándares H.264
  MAX_BITRATE_MBPS: {
    '4K': 35,       // 4K (3840x2160) 30fps
    '1080p': 12,    // Full HD (1920x1080) 60fps
    '720p': 8,      // HD (1280x720) 30fps
    '480p': 5,      // SD (854x480)
  },

  // Tamaño máximo por minuto (MB/min) - calculado desde bitrate
  // Formula: (Mbps * 60 segundos * 1024 KB) / (8 bits * 1024 MB)
  MAX_SIZE_PER_MINUTE_MB: {
    '4K': 260,      // ~35 Mbps
    '1080p': 90,    // ~12 Mbps
    '720p': 60,     // ~8 Mbps
    '480p': 38,     // ~5 Mbps
  },

  // Umbral para activar compresión (multiplicador del límite)
  // Si el bitrate real > límite * THRESHOLD, comprimir
  COMPRESSION_THRESHOLD: 1.3, // 30% más del esperado (ajustado para videos móviles)

  // Calidad de compresión por rango de exceso
  COMPRESSION_QUALITY: {
    MINOR: 'high' as const,    // 1.3x - 2x del límite (bitrate ligeramente alto)
    MODERATE: 'medium' as const, // 2x - 3x del límite (bitrate alto)
    SEVERE: 'low' as const,    // >3x del límite (bitrate excesivo)
  },
};

// Tipos
export type VideoResolutionCategory = '4K' | '1080p' | '720p' | '480p';
export type CompressionQuality = 'high' | 'medium' | 'low' | 'none';

export interface VideoAnalysis {
  // Información básica
  fileSizeMB: number;
  durationSeconds?: number;
  width?: number;
  height?: number;

  // Métricas calculadas
  resolutionCategory: VideoResolutionCategory;
  bitrateMbps?: number;
  sizePerMinuteMB?: number;

  // Decisión de compresión
  shouldCompress: boolean;
  recommendedQuality: CompressionQuality;
  reason: string;

  // Validaciones
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

class VideoAnalysisService {
  /**
   * Detecta la categoría de resolución basándose en dimensiones
   */
  private detectResolutionCategory(width?: number, height?: number): VideoResolutionCategory {
    if (!width || !height) {
      // Sin dimensiones, asumir 1080p como estándar moderno
      return '1080p';
    }

    const pixels = width * height;

    // 4K: >= 3840x2160 (8.3M pixels)
    if (pixels >= 8000000) return '4K';

    // 1080p: >= 1920x1080 (2M pixels)
    if (pixels >= 2000000) return '1080p';

    // 720p: >= 1280x720 (920K pixels)
    if (pixels >= 900000) return '720p';

    // 480p o menor
    return '480p';
  }

  /**
   * Calcula el bitrate del video en Mbps
   */
  private calculateBitrate(fileSizeMB: number, durationSeconds: number): number {
    // Bitrate (Mbps) = (File Size (MB) * 8) / Duration (seconds)
    return (fileSizeMB * 8) / durationSeconds;
  }

  /**
   * Determina la calidad de compresión según el exceso de bitrate
   */
  private determineCompressionQuality(
    actualBitrate: number,
    maxBitrate: number
  ): CompressionQuality {
    const ratio = actualBitrate / maxBitrate;

    console.log(`🔍 Análisis: Ratio ${ratio.toFixed(2)} vs Umbral ${VIDEO_STANDARDS.COMPRESSION_THRESHOLD}`);

    if (ratio <= VIDEO_STANDARDS.COMPRESSION_THRESHOLD) {
      return 'none'; // No necesita compresión
    }

    if (ratio <= 2.0) {
      return VIDEO_STANDARDS.COMPRESSION_QUALITY.MINOR; // high (8 Mbps)
    }

    if (ratio <= 3.0) {
      return VIDEO_STANDARDS.COMPRESSION_QUALITY.MODERATE; // medium (5 Mbps)
    }

    return VIDEO_STANDARDS.COMPRESSION_QUALITY.SEVERE; // low (2 Mbps)
  }

  /**
   * Analiza un video y determina si necesita compresión
   */
  async analyzeVideo(videoUri: string): Promise<VideoAnalysis> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Obtener tamaño del archivo
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (!fileInfo.exists || !('size' in fileInfo)) {
        errors.push('No se pudo acceder al archivo de video');
        return this.createErrorAnalysis(errors);
      }

      const fileSizeMB = fileInfo.size / (1024 * 1024);

      // 2. Obtener metadata del video (duración, dimensiones)
      let videoInfo: { duration?: number; width?: number; height?: number } = {};
      try {
        videoInfo = await videoService.getVideoInfo(videoUri);
      } catch (error) {
        warnings.push('No se pudo obtener metadata completa del video');
        console.warn('Error obteniendo metadata:', error);
      }

      const { duration, width, height } = videoInfo;
      const durationSeconds = duration;

      // 3. Detectar resolución
      const resolutionCategory = this.detectResolutionCategory(width, height);

      // 4. Validar duración máxima
      if (durationSeconds && durationSeconds > VIDEO_STANDARDS.MAX_DURATION_SECONDS) {
        errors.push(
          `El video excede la duración máxima de ${VIDEO_STANDARDS.MAX_DURATION_SECONDS / 60} minutos (duración: ${Math.round(durationSeconds / 60)} min)`
        );
      }

      // 5. Calcular métricas
      let bitrateMbps: number | undefined;
      let sizePerMinuteMB: number | undefined;

      if (durationSeconds && durationSeconds > 0) {
        bitrateMbps = this.calculateBitrate(fileSizeMB, durationSeconds);
        sizePerMinuteMB = (fileSizeMB / durationSeconds) * 60;
      }

      // 6. Determinar si necesita compresión
      const maxBitrate = VIDEO_STANDARDS.MAX_BITRATE_MBPS[resolutionCategory];
      let shouldCompress = false;
      let recommendedQuality: CompressionQuality = 'none';
      let reason = 'El video está dentro de los límites recomendados';

      if (bitrateMbps) {
        recommendedQuality = this.determineCompressionQuality(bitrateMbps, maxBitrate);
        shouldCompress = recommendedQuality !== 'none';

        if (shouldCompress) {
          const ratio = (bitrateMbps / maxBitrate).toFixed(1);
          reason = `Bitrate alto detectado: ${bitrateMbps.toFixed(1)} Mbps (${ratio}x el límite de ${maxBitrate} Mbps para ${resolutionCategory}). Se recomienda compresión "${recommendedQuality}".`;
        }
      } else {
        // Sin duración, usar heurística conservadora basada en tamaño
        // Si el archivo es > 300 MB, probablemente necesita compresión
        if (fileSizeMB > 300) {
          shouldCompress = true;
          recommendedQuality = 'medium';
          reason = `Video grande (${fileSizeMB.toFixed(0)} MB) sin metadata de duración. Compresión recomendada por seguridad.`;
          warnings.push('No se pudo determinar duración. Usando heurística basada en tamaño.');
        }
      }

      // 7. Advertencias adicionales
      if (fileSizeMB > 1000) {
        warnings.push(`Archivo muy grande (${fileSizeMB.toFixed(0)} MB). La subida puede tardar varios minutos.`);
      }

      return {
        // Información básica
        fileSizeMB,
        durationSeconds,
        width,
        height,

        // Métricas calculadas
        resolutionCategory,
        bitrateMbps,
        sizePerMinuteMB,

        // Decisión de compresión
        shouldCompress,
        recommendedQuality,
        reason,

        // Validaciones
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      console.error('Error analizando video:', error);
      errors.push(`Error inesperado: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.createErrorAnalysis(errors);
    }
  }

  /**
   * Crea un análisis de error
   */
  private createErrorAnalysis(errors: string[]): VideoAnalysis {
    return {
      fileSizeMB: 0,
      resolutionCategory: '1080p',
      shouldCompress: false,
      recommendedQuality: 'none',
      reason: 'Error al analizar el video',
      isValid: false,
      errors,
      warnings: [],
    };
  }

  /**
   * Formatea el análisis en un reporte legible
   */
  formatAnalysisReport(analysis: VideoAnalysis): string {
    const lines: string[] = [];

    lines.push('📊 ANÁLISIS DE VIDEO');
    lines.push('─'.repeat(40));

    // Información básica
    lines.push(`📁 Tamaño: ${analysis.fileSizeMB.toFixed(2)} MB`);
    if (analysis.durationSeconds) {
      const minutes = Math.floor(analysis.durationSeconds / 60);
      const seconds = analysis.durationSeconds % 60;
      lines.push(`⏱️  Duración: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
    if (analysis.width && analysis.height) {
      lines.push(`📐 Resolución: ${analysis.width}x${analysis.height} (${analysis.resolutionCategory})`);
    }

    // Métricas
    if (analysis.bitrateMbps) {
      lines.push(`📊 Bitrate: ${analysis.bitrateMbps.toFixed(1)} Mbps`);
    }
    if (analysis.sizePerMinuteMB) {
      lines.push(`📈 Tamaño/min: ${analysis.sizePerMinuteMB.toFixed(0)} MB/min`);
    }

    lines.push('─'.repeat(40));

    // Decisión
    if (analysis.shouldCompress) {
      lines.push(`⚠️  COMPRESIÓN RECOMENDADA: ${analysis.recommendedQuality.toUpperCase()}`);
    } else {
      lines.push('✅ NO REQUIERE COMPRESIÓN');
    }
    lines.push(`💡 ${analysis.reason}`);

    // Advertencias y errores
    if (analysis.warnings.length > 0) {
      lines.push('─'.repeat(40));
      lines.push('⚠️  ADVERTENCIAS:');
      analysis.warnings.forEach(w => lines.push(`   • ${w}`));
    }

    if (analysis.errors.length > 0) {
      lines.push('─'.repeat(40));
      lines.push('❌ ERRORES:');
      analysis.errors.forEach(e => lines.push(`   • ${e}`));
    }

    return lines.join('\n');
  }
}

export default new VideoAnalysisService();
