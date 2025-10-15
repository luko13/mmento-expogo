// services/cloudflare/CloudflareImagesService.ts
import * as FileSystem from 'expo-file-system';

/**
 * Cloudflare Images Service
 * Maneja la subida y transformación de imágenes con Cloudflare Images
 * Docs: https://developers.cloudflare.com/images/
 */

export interface ImagesUploadResult {
  success: boolean;
  imageId?: string;
  url?: string;
  variants?: string[];
  error?: string;
}

export interface ImageVariant {
  name: string;
  width?: number;
  height?: number;
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
}

// Variants predefinidas según configuración
export const IMAGE_VARIANTS = {
  thumbnail: 'thumbnail', // 200x200
  medium: 'medium',       // 800x800
  large: 'large',         // 1920x1920
  public: 'public',       // Tamaño original o configurado
} as const;

class CloudflareImagesService {
  private accountId: string;
  private apiToken: string;
  private accountHash: string;
  private deliveryUrl: string;
  private baseUrl: string;

  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.apiToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN || '';
    this.accountHash = process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH || '';
    this.deliveryUrl = process.env.CLOUDFLARE_IMAGES_DELIVERY_URL || 'https://imagedelivery.net';
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/images/v1`;

    if (!this.accountId || !this.apiToken || !this.accountHash) {
      console.warn('⚠️ Cloudflare Images credentials not configured');
    }
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  isConfigured(): boolean {
    return !!(this.accountId && this.apiToken && this.accountHash);
  }

  /**
   * Sube una imagen a Cloudflare Images
   */
  async uploadImage(
    imageUri: string,
    metadata?: {
      id?: string;
      requireSignedURLs?: boolean;
      metadata?: Record<string, string>;
    }
  ): Promise<ImagesUploadResult> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Cloudflare Images no está configurado correctamente');
      }

      console.log('📤 Subiendo imagen a Cloudflare Images:', imageUri);

      // En React Native, FormData acepta URIs directamente
      const formData = new FormData();

      // Añadir archivo directamente con URI (React Native lo maneja)
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);

      // Añadir metadata si existe
      if (metadata?.id) {
        formData.append('id', metadata.id);
      }
      if (metadata?.requireSignedURLs !== undefined) {
        formData.append('requireSignedURLs', metadata.requireSignedURLs.toString());
      }
      if (metadata?.metadata) {
        formData.append('metadata', JSON.stringify(metadata.metadata));
      }

      // Subir la imagen
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          // NO incluir Content-Type, FormData lo maneja automáticamente
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error subiendo imagen: ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.errors?.[0]?.message || 'Error desconocido');
      }

      const imageId = data.result.id;
      console.log('✅ Imagen subida exitosamente. ID:', imageId);

      // Construir URLs de variants
      const variants = Object.values(IMAGE_VARIANTS).map(variant =>
        this.getImageUrl(imageId, variant)
      );

      return {
        success: true,
        imageId,
        url: this.getImageUrl(imageId, IMAGE_VARIANTS.public),
        variants,
      };

    } catch (error) {
      console.error('❌ Error subiendo imagen a Cloudflare Images:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Obtiene la URL de una imagen con una variant específica
   */
  getImageUrl(
    imageId: string,
    variant: string = IMAGE_VARIANTS.public,
    options?: {
      format?: 'auto' | 'webp' | 'avif' | 'json';
      width?: number;
      height?: number;
      fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
      quality?: number; // 1-100
    }
  ): string {
    let url = `${this.deliveryUrl}/${this.accountHash}/${imageId}/${variant}`;

    // Añadir parámetros de transformación si se especifican
    const params = new URLSearchParams();

    if (options?.format) params.append('format', options.format);
    if (options?.width) params.append('width', options.width.toString());
    if (options?.height) params.append('height', options.height.toString());
    if (options?.fit) params.append('fit', options.fit);
    if (options?.quality) params.append('quality', options.quality.toString());

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  /**
   * Elimina una imagen de Cloudflare Images
   */
  async deleteImage(imageId: string): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Cloudflare Images no está configurado correctamente');
      }

      console.log(`🗑️ Eliminando imagen de Cloudflare Images: ${imageId}`);

      const response = await fetch(`${this.baseUrl}/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error eliminando imagen: ${errorText}`);
      }

      console.log('✅ Imagen eliminada exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error eliminando imagen:', error);
      return false;
    }
  }

  /**
   * Obtiene información de una imagen
   */
  async getImageDetails(imageId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${imageId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error obteniendo detalles: ${response.status}`);
      }

      const data = await response.json();
      return data.result;

    } catch (error) {
      console.error('Error obteniendo detalles de imagen:', error);
      return null;
    }
  }

  /**
   * Extrae el image ID de una URL de Cloudflare Images
   */
  extractImageId(url: string): string | null {
    // Formato: https://imagedelivery.net/{account-hash}/{image-id}/{variant}
    const match = url.match(/imagedelivery\.net\/[^\/]+\/([^\/]+)\//);
    return match ? match[1] : null;
  }

  /**
   * Verifica si una URL es de Cloudflare Images
   */
  isCloudflareImagesUrl(url: string): boolean {
    return url.includes('imagedelivery.net');
  }

  /**
   * Sube una imagen desde una URL (útil para migración)
   */
  async uploadFromUrl(
    sourceUrl: string,
    metadata?: {
      id?: string;
      requireSignedURLs?: boolean;
      metadata?: Record<string, string>;
    }
  ): Promise<ImagesUploadResult> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Cloudflare Images no está configurado correctamente');
      }

      console.log('📥 Subiendo imagen desde URL:', sourceUrl);

      const formData = new FormData();
      formData.append('url', sourceUrl);

      if (metadata?.id) {
        formData.append('id', metadata.id);
      }
      if (metadata?.requireSignedURLs !== undefined) {
        formData.append('requireSignedURLs', metadata.requireSignedURLs.toString());
      }
      if (metadata?.metadata) {
        formData.append('metadata', JSON.stringify(metadata.metadata));
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error subiendo imagen: ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.errors?.[0]?.message || 'Error desconocido');
      }

      const imageId = data.result.id;
      console.log('✅ Imagen subida desde URL. ID:', imageId);

      const variants = Object.values(IMAGE_VARIANTS).map(variant =>
        this.getImageUrl(imageId, variant)
      );

      return {
        success: true,
        imageId,
        url: this.getImageUrl(imageId, IMAGE_VARIANTS.public),
        variants,
      };

    } catch (error) {
      console.error('❌ Error subiendo imagen desde URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Lista todas las imágenes (con paginación)
   */
  async listImages(page: number = 1, perPage: number = 100): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}?page=${page}&per_page=${perPage}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error listando imágenes: ${response.status}`);
      }

      const data = await response.json();
      return data.result;

    } catch (error) {
      console.error('Error listando imágenes:', error);
      return null;
    }
  }
}

export default new CloudflareImagesService();
