// services/cloudflare/CloudflareStorageService.ts
import CloudflareStreamService from './CloudflareStreamService';
import CloudflareR2Service from './CloudflareR2Service';
import CloudflareImagesService, { IMAGE_VARIANTS } from './CloudflareImagesService';
import * as FileSystem from 'expo-file-system';

/**
 * Cloudflare Storage Service (Unified)
 * Servicio unificado que gestiona videos, imágenes y archivos usando Cloudflare
 * - Videos → Cloudflare Stream
 * - Imágenes → Cloudflare Images (con R2 como fallback)
 * - Otros archivos → Cloudflare R2
 */

export type MediaType = 'video' | 'image' | 'file';

export interface UploadResult {
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  mediaId?: string;
  mediaType: MediaType;
  error?: string;
  variants?: {
    thumbnail?: string;
    medium?: string;
    large?: string;
    hls?: string;
    dash?: string;
  };
}

export interface UploadOptions {
  userId?: string;
  trickId?: string;
  folder?: string;
  metadata?: Record<string, string>;
  onProgress?: (progress: number, event?: { totalBytesSent: number; totalBytesExpectedToSend: number }) => void;
  useImagesForPhotos?: boolean; // Si false, usa R2 para fotos
}

class CloudflareStorageService {
  /**
   * Sube un archivo (video, imagen o archivo genérico)
   * Detecta automáticamente el tipo y usa el servicio apropiado
   */
  async uploadFile(
    fileUri: string,
    fileName: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    try {
      // Detectar tipo de archivo
      const mediaType = this.detectMediaType(fileName);
      console.log(`🔍 Tipo de archivo detectado: ${mediaType}`);

      switch (mediaType) {
        case 'video':
          return await this.uploadVideo(fileUri, fileName, options);

        case 'image':
          return await this.uploadImage(fileUri, fileName, options);

        default:
          return await this.uploadGenericFile(fileUri, fileName, options);
      }

    } catch (error) {
      console.error('❌ Error en uploadFile:', error);
      return {
        success: false,
        mediaType: this.detectMediaType(fileName),
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Sube un video a Cloudflare Stream
   */
  private async uploadVideo(
    videoUri: string,
    fileName: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    try {
      console.log('🎬 Subiendo video a Cloudflare Stream...');

      // Validar configuración ANTES de intentar subir
      if (!CloudflareStreamService.isConfigured()) {
        console.error('❌ Cloudflare Stream no está configurado');
        const config = this.isFullyConfigured();
        console.error('Estado de configuración:', config);
        throw new Error(
          'Cloudflare Stream no está configurado. Verifica las variables de entorno:\n' +
          '- CLOUDFLARE_ACCOUNT_ID\n' +
          '- CLOUDFLARE_STREAM_API_TOKEN\n' +
          '- CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN'
        );
      }

      const result = await CloudflareStreamService.uploadVideo(
        videoUri,
        {
          name: fileName,
          userId: options?.userId,
          trickId: options?.trickId,
        },
        options?.onProgress
      );

      if (!result.success) {
        throw new Error(result.error || 'Error subiendo video');
      }

      return {
        success: true,
        url: result.hlsUrl,
        thumbnailUrl: result.thumbnailUrl,
        mediaId: result.videoId,
        mediaType: 'video',
        variants: {
          hls: result.hlsUrl,
          dash: result.dashUrl,
          thumbnail: result.thumbnailUrl,
        },
      };

    } catch (error) {
      console.error('❌ Error subiendo video:', error);
      return {
        success: false,
        mediaType: 'video',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Sube una imagen a Cloudflare Images o R2
   */
  private async uploadImage(
    imageUri: string,
    fileName: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    try {
      const useImages = options?.useImagesForPhotos ?? true;

      if (useImages && CloudflareImagesService.isConfigured()) {
        console.log('🖼️ Subiendo imagen a Cloudflare Images...');
        return await this.uploadToCloudflareImages(imageUri, fileName, options);
      } else {
        console.log('📦 Subiendo imagen a Cloudflare R2...');
        return await this.uploadImageToR2(imageUri, fileName, options);
      }

    } catch (error) {
      console.error('❌ Error subiendo imagen:', error);
      return {
        success: false,
        mediaType: 'image',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Sube imagen a Cloudflare Images (con transformaciones)
   */
  private async uploadToCloudflareImages(
    imageUri: string,
    fileName: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const result = await CloudflareImagesService.uploadImage(imageUri, {
      metadata: {
        fileName,
        userId: options?.userId || '',
        trickId: options?.trickId || '',
        ...options?.metadata,
      },
    });

    if (!result.success) {
      throw new Error(result.error || 'Error subiendo a Cloudflare Images');
    }

    return {
      success: true,
      url: result.url,
      thumbnailUrl: CloudflareImagesService.getImageUrl(
        result.imageId!,
        IMAGE_VARIANTS.thumbnail
      ),
      mediaId: result.imageId,
      mediaType: 'image',
      variants: {
        thumbnail: CloudflareImagesService.getImageUrl(
          result.imageId!,
          IMAGE_VARIANTS.thumbnail
        ),
        medium: CloudflareImagesService.getImageUrl(
          result.imageId!,
          IMAGE_VARIANTS.medium
        ),
        large: CloudflareImagesService.getImageUrl(
          result.imageId!,
          IMAGE_VARIANTS.large
        ),
      },
    };
  }

  /**
   * Sube imagen a R2 (sin transformaciones automáticas)
   */
  private async uploadImageToR2(
    imageUri: string,
    fileName: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const folder = options?.folder || 'images';
    const key = CloudflareR2Service.generateUniqueKey(
      folder,
      fileName,
      options?.userId
    );

    const result = await CloudflareR2Service.uploadFile(imageUri, key, {
      contentType: this.getContentType(fileName),
      metadata: {
        fileName,
        userId: options?.userId || '',
        trickId: options?.trickId || '',
        ...options?.metadata,
      },
      onProgress: options?.onProgress,
    });

    if (!result.success) {
      throw new Error(result.error || 'Error subiendo a R2');
    }

    return {
      success: true,
      url: result.publicUrl,
      thumbnailUrl: result.publicUrl,
      mediaId: result.key,
      mediaType: 'image',
    };
  }

  /**
   * Sube archivo genérico a R2
   */
  private async uploadGenericFile(
    fileUri: string,
    fileName: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    try {
      console.log('📎 Subiendo archivo a Cloudflare R2...');

      const folder = options?.folder || 'files';
      const key = CloudflareR2Service.generateUniqueKey(
        folder,
        fileName,
        options?.userId
      );

      const result = await CloudflareR2Service.uploadFile(fileUri, key, {
        contentType: this.getContentType(fileName),
        metadata: {
          fileName,
          userId: options?.userId || '',
          ...options?.metadata,
        },
        onProgress: options?.onProgress,
      });

      if (!result.success) {
        throw new Error(result.error || 'Error subiendo archivo');
      }

      return {
        success: true,
        url: result.publicUrl,
        mediaId: result.key,
        mediaType: 'file',
      };

    } catch (error) {
      console.error('❌ Error subiendo archivo:', error);
      return {
        success: false,
        mediaType: 'file',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Elimina un archivo de Cloudflare
   */
  async deleteFile(url: string, mediaType?: MediaType): Promise<boolean> {
    try {
      const detectedType = mediaType || this.detectMediaTypeFromUrl(url);

      switch (detectedType) {
        case 'video':
          const videoId = CloudflareStreamService.extractVideoId(url);
          if (videoId) {
            return await CloudflareStreamService.deleteVideo(videoId);
          }
          break;

        case 'image':
          if (CloudflareImagesService.isCloudflareImagesUrl(url)) {
            const imageId = CloudflareImagesService.extractImageId(url);
            if (imageId) {
              return await CloudflareImagesService.deleteImage(imageId);
            }
          } else if (CloudflareR2Service.isR2Url(url)) {
            const key = CloudflareR2Service.extractKeyFromUrl(url);
            if (key) {
              return await CloudflareR2Service.deleteFile(key);
            }
          }
          break;

        default:
          const key = CloudflareR2Service.extractKeyFromUrl(url);
          if (key) {
            return await CloudflareR2Service.deleteFile(key);
          }
      }

      return false;

    } catch (error) {
      console.error('❌ Error eliminando archivo:', error);
      return false;
    }
  }

  /**
   * Obtiene URL de thumbnail de un video
   */
  getVideoThumbnail(
    videoId: string,
    options?: { time?: string; width?: number; height?: number }
  ): string {
    return CloudflareStreamService.getThumbnailUrl(videoId, options);
  }

  /**
   * Obtiene URL de una imagen con transformaciones
   */
  getImageUrl(
    imageId: string,
    variant?: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
    }
  ): string {
    return CloudflareImagesService.getImageUrl(imageId, variant, options);
  }

  /**
   * Detecta el tipo de medio por extensión
   */
  private detectMediaType(fileName: string): MediaType {
    const extension = fileName.split('.').pop()?.toLowerCase();

    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];

    if (extension && videoExtensions.includes(extension)) {
      return 'video';
    }
    if (extension && imageExtensions.includes(extension)) {
      return 'image';
    }

    return 'file';
  }

  /**
   * Detecta el tipo de medio desde una URL
   */
  private detectMediaTypeFromUrl(url: string): MediaType {
    if (url.includes('cloudflarestream.com')) {
      return 'video';
    }
    if (url.includes('imagedelivery.net')) {
      return 'image';
    }
    if (url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
      return 'image';
    }
    if (url.match(/\.(mp4|mov|avi|mkv|webm)(\?|$)/i)) {
      return 'video';
    }

    return 'file';
  }

  /**
   * Obtiene el content-type por extensión
   */
  private getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    const contentTypes: Record<string, string> = {
      // Videos
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
      webm: 'video/webm',
      m4v: 'video/x-m4v',

      // Imágenes
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',

      // Otros
      pdf: 'application/pdf',
      json: 'application/json',
      txt: 'text/plain',
    };

    return extension ? (contentTypes[extension] || 'application/octet-stream') : 'application/octet-stream';
  }

  /**
   * Verifica si todos los servicios están configurados
   */
  isFullyConfigured(): {
    stream: boolean;
    r2: boolean;
    images: boolean;
  } {
    return {
      stream: CloudflareStreamService.isConfigured(),
      r2: CloudflareR2Service.isConfigured(),
      images: CloudflareImagesService.isConfigured(),
    };
  }
}

export default new CloudflareStorageService();
