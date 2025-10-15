// services/cloudflare/CloudflareR2Service.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import * as FileSystem from 'expo-file-system';

/**
 * Cloudflare R2 Service
 * Maneja el almacenamiento de archivos en Cloudflare R2 (compatible con S3)
 * Docs: https://developers.cloudflare.com/r2/
 */

export interface R2UploadResult {
  success: boolean;
  url?: string;
  publicUrl?: string;
  key?: string;
  error?: string;
}

export interface R2UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  onProgress?: (progress: number) => void;
}

class CloudflareR2Service {
  private client: S3Client | null = null;
  private bucketName: string;
  private publicUrl: string;
  private endpoint: string;

  constructor() {
    this.bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || '';
    this.publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';
    this.endpoint = process.env.CLOUDFLARE_R2_ENDPOINT || '';

    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey && this.endpoint) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: this.endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      console.log('✅ Cloudflare R2 client initialized');
    } else {
      console.warn('⚠️ Cloudflare R2 credentials not configured');
    }
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  isConfigured(): boolean {
    return !!(this.client && this.bucketName && this.publicUrl);
  }

  /**
   * Sube un archivo a R2
   */
  async uploadFile(
    fileUri: string,
    key: string,
    options?: R2UploadOptions
  ): Promise<R2UploadResult> {
    try {
      if (!this.client) {
        throw new Error('Cloudflare R2 no está configurado correctamente');
      }

      console.log(`📤 Subiendo archivo a R2: ${key}`);

      // Leer el archivo como base64 primero
      const base64Data = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convertir base64 a buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // Obtener información del archivo para el progreso
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : buffer.length;

      console.log(`📊 Tamaño del archivo: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

      // Usar Upload de @aws-sdk/lib-storage para soporte de progreso
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: options?.contentType || 'application/octet-stream',
          Metadata: options?.metadata || {},
        },
      });

      // Escuchar progreso si se proporciona callback
      if (options?.onProgress) {
        upload.on('httpUploadProgress', (progress) => {
          if (progress.loaded && progress.total) {
            const percentage = (progress.loaded / progress.total) * 100;
            options.onProgress!(percentage);
          }
        });
      }

      // Ejecutar la subida
      await upload.done();

      console.log('✅ Archivo subido exitosamente a R2');

      // Construir URL pública
      const publicUrl = `${this.publicUrl}/${key}`;

      return {
        success: true,
        url: publicUrl,
        publicUrl,
        key,
      };

    } catch (error) {
      console.error('❌ Error subiendo archivo a R2:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Elimina un archivo de R2
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      if (!this.client) {
        throw new Error('Cloudflare R2 no está configurado correctamente');
      }

      console.log(`🗑️ Eliminando archivo de R2: ${key}`);

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);

      console.log('✅ Archivo eliminado exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error eliminando archivo de R2:', error);
      return false;
    }
  }

  /**
   * Genera una URL pública para un archivo
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  /**
   * Genera un nombre de archivo único
   */
  generateUniqueKey(
    folder: string,
    filename: string,
    userId?: string
  ): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const extension = filename.split('.').pop() || 'bin';

    const userPrefix = userId ? `${userId}/` : '';
    return `${userPrefix}${folder}/${timestamp}_${randomStr}.${extension}`;
  }

  /**
   * Extrae la key de una URL pública de R2
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Remover el primer slash
      return urlObj.pathname.substring(1);
    } catch (error) {
      console.error('Error extrayendo key de URL:', error);
      return null;
    }
  }

  /**
   * Verifica si una URL es de R2
   */
  isR2Url(url: string): boolean {
    return url.includes(this.publicUrl) || url.includes('.r2.dev');
  }

  /**
   * Obtiene información de un archivo (sin descargar el contenido completo)
   */
  async getFileMetadata(key: string): Promise<{
    exists: boolean;
    size?: number;
    contentType?: string;
    lastModified?: Date;
  }> {
    try {
      if (!this.client) {
        throw new Error('Cloudflare R2 no está configurado correctamente');
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);

      return {
        exists: true,
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
      };

    } catch (error) {
      console.error('Error obteniendo metadata del archivo:', error);
      return { exists: false };
    }
  }

  /**
   * Copia un archivo de una URL externa a R2
   * Útil para migración desde Supabase
   */
  async copyFromUrl(
    sourceUrl: string,
    destinationKey: string,
    options?: {
      contentType?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<R2UploadResult> {
    try {
      if (!this.client) {
        throw new Error('Cloudflare R2 no está configurado correctamente');
      }

      console.log(`📥 Descargando archivo desde: ${sourceUrl}`);

      // Descargar el archivo
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error(`Error descargando archivo: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`📤 Subiendo a R2: ${destinationKey}`);

      // Subir a R2
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: destinationKey,
        Body: buffer,
        ContentType: options?.contentType || response.headers.get('content-type') || 'application/octet-stream',
        Metadata: options?.metadata || {},
      });

      await this.client.send(command);

      console.log('✅ Archivo copiado exitosamente a R2');

      const publicUrl = this.getPublicUrl(destinationKey);

      return {
        success: true,
        url: publicUrl,
        publicUrl,
        key: destinationKey,
      };

    } catch (error) {
      console.error('❌ Error copiando archivo a R2:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }
}

export default new CloudflareR2Service();
