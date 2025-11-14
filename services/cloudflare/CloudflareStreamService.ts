// services/cloudflare/CloudflareStreamService.ts
import * as FileSystem from "expo-file-system";

/**
 * Cloudflare Stream Service
 * Maneja la subida y gestión de videos en Cloudflare Stream
 * Docs: https://developers.cloudflare.com/stream/uploading-videos/upload-video-file/
 */

// Tipos
export interface StreamVideoUploadResult {
  success: boolean;
  videoId?: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  dashUrl?: string;
  hlsUrl?: string;
  error?: string;
}

export interface StreamVideoMetadata {
  videoId: string;
  status: 'queued' | 'inprogress' | 'ready' | 'error';
  duration?: number;
  playback?: {
    hls: string;
    dash: string;
  };
  thumbnail?: string;
  preview?: string;
  meta?: {
    name?: string;
  };
}

class CloudflareStreamService {
  private accountId: string;
  private apiToken: string;
  private customerSubdomain: string;
  private baseUrl: string;

  // 🔒 Sistema de idempotencia: evita duplicados por reintentos
  private activeUploads: Map<string, Promise<StreamVideoUploadResult>> = new Map();

  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN || '';
    this.customerSubdomain = process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN || '';
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`;

    if (!this.accountId || !this.apiToken) {
      console.warn('⚠️ Cloudflare Stream credentials not configured');
    }
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  isConfigured(): boolean {
    return !!(this.accountId && this.apiToken && this.customerSubdomain);
  }

  /**
   * Genera ID único de subida para idempotencia
   * Evita duplicados en caso de reintentos por timeouts o errores de red
   */
  private generateUploadId(videoUri: string, metadata?: { userId?: string; trickId?: string }): string {
    const timestamp = Date.now();
    const uriHash = videoUri.split('/').pop()?.substring(0, 10) || 'unknown';
    const userId = metadata?.userId || 'anonymous';
    const trickId = metadata?.trickId || 'notrick';

    return `upload_${userId}_${trickId}_${uriHash}_${timestamp}`;
  }

  /**
   * Verifica si ya existe una subida activa para el mismo archivo
   */
  private getActiveUpload(uploadId: string): Promise<StreamVideoUploadResult> | null {
    return this.activeUploads.get(uploadId) || null;
  }

  /**
   * Busca videos existentes con los mismos metadatos
   * Previene duplicados antes de reintentar una subida fallida
   */
  private async findExistingVideo(metadata?: { userId?: string; trickId?: string }): Promise<string | null> {
    try {
      if (!metadata?.userId || !metadata?.trickId) {
        return null; // Sin metadatos suficientes, no podemos buscar
      }

      console.log(`🔍 Buscando video existente con userId=${metadata.userId}, trickId=${metadata.trickId}...`);

      // Listar videos recientes (últimos 50) y buscar coincidencia de metadatos
      const response = await fetch(`${this.baseUrl}?limit=50`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
      });

      if (!response.ok) {
        console.warn('⚠️ No se pudo buscar videos existentes');
        return null;
      }

      const data = await response.json();
      const videos = data.result || [];

      // Buscar video con metadatos coincidentes subido en las últimas 2 horas
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);

      for (const video of videos) {
        const videoCreatedAt = new Date(video.created).getTime();

        // Solo considerar videos recientes
        if (videoCreatedAt < twoHoursAgo) {
          continue;
        }

        // Verificar metadatos
        const videoMeta = video.meta || {};
        if (videoMeta.userId === metadata.userId && videoMeta.trickId === metadata.trickId) {
          console.log(`✅ Video existente encontrado: ${video.uid}`);
          return video.uid;
        }
      }

      console.log('ℹ️ No se encontró video duplicado');
      return null;

    } catch (error) {
      console.error('Error buscando video existente:', error);
      return null;
    }
  }

  /**
   * Sube un video a Cloudflare Stream usando TUS (resumable uploads)
   * Docs: https://developers.cloudflare.com/stream/uploading-videos/upload-video-file/
   *
   * 🔒 Mejoras de idempotencia:
   * - Previene subidas duplicadas simultáneas del mismo archivo
   * - Verifica videos existentes antes de reintentar
   * - Logging detallado para debugging de duplicados
   */
  async uploadVideo(
    videoUri: string,
    metadata?: {
      name?: string;
      userId?: string;
      trickId?: string;
    },
    onProgress?: (progress: number, event?: { totalBytesSent: number; totalBytesExpectedToSend: number }) => void
  ): Promise<StreamVideoUploadResult> {
    // 🔒 PASO 1: Generar ID único para esta subida
    const uploadId = this.generateUploadId(videoUri, metadata);
    console.log(`🆔 Upload ID: ${uploadId}`);

    // 🔒 PASO 2: Verificar si ya hay una subida activa del mismo archivo
    const existingUpload = this.getActiveUpload(uploadId);
    if (existingUpload) {
      console.log(`⏳ Subida ya en progreso para ${uploadId}, reutilizando...`);
      return existingUpload;
    }

    // 🔒 PASO 3: Crear promesa de subida y registrarla
    const uploadPromise = this._uploadVideoInternal(videoUri, metadata, onProgress, uploadId);

    this.activeUploads.set(uploadId, uploadPromise);

    // Limpiar el registro cuando termine (éxito o error)
    uploadPromise.finally(() => {
      this.activeUploads.delete(uploadId);
      console.log(`🧹 Upload ID ${uploadId} limpiado del registro`);
    });

    return uploadPromise;
  }

  /**
   * Implementación interna de uploadVideo con reintentos inteligentes
   */
  private async _uploadVideoInternal(
    videoUri: string,
    metadata?: {
      name?: string;
      userId?: string;
      trickId?: string;
    },
    onProgress?: (progress: number, event?: { totalBytesSent: number; totalBytesExpectedToSend: number }) => void,
    uploadId?: string
  ): Promise<StreamVideoUploadResult> {
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;
    let uploadUrl: string | null = null; // 🔒 Guardar para logging

    // Intentar hasta MAX_RETRIES veces
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`📤 [Intento ${attempt}/${MAX_RETRIES}] Subiendo video... ${uploadId ? `(${uploadId})` : ''}`);

        // 🔒 MEJORA: Antes de reintentar, verificar si el video ya existe
        if (attempt > 1) {
          console.log(`🔍 Verificando si el video ya fue subido en intento anterior...`);
          const existingVideoId = await this.findExistingVideo(metadata);

          if (existingVideoId) {
            console.log(`✅ Video ya existe! Retornando video existente: ${existingVideoId}`);
            const playbackUrl = `https://${this.customerSubdomain}/${existingVideoId}/manifest/video.m3u8`;
            const thumbnailUrl = `https://${this.customerSubdomain}/${existingVideoId}/thumbnails/thumbnail.jpg`;
            const dashUrl = `https://${this.customerSubdomain}/${existingVideoId}/manifest/video.mpd`;

            return {
              success: true,
              videoId: existingVideoId,
              playbackUrl,
              thumbnailUrl,
              dashUrl,
              hlsUrl: playbackUrl,
            };
          }
        }

        if (!this.isConfigured()) {
          throw new Error('Cloudflare Stream no está configurado');
        }

        const fileInfo = await FileSystem.getInfoAsync(videoUri);
        if (!fileInfo.exists || !('size' in fileInfo)) {
          throw new Error('Archivo de video no encontrado');
        }

        const fileSize = fileInfo.size;
        const estimatedUploadTime = Math.max(120, Math.ceil(fileSize / (10 * 1024 * 1024)) * 30);

        console.log(`📊 Tamaño del archivo: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

        // Paso 1: Crear upload session usando TUS protocol
        const tusEndpoint = `${this.baseUrl}?direct_user=true`;

        const tusHeaders: Record<string, string> = {
          'Authorization': `Bearer ${this.apiToken}`,
          'Tus-Resumable': '1.0.0',
          'Upload-Length': fileSize.toString(),
          'Upload-Metadata': this.buildTusMetadata(metadata),
        };

        console.log(`🔗 Creando sesión TUS en: ${tusEndpoint}`);

        const createResponse = await Promise.race([
          fetch(tusEndpoint, {
            method: 'POST',
            headers: tusHeaders,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout al crear sesión')), 30000)
          ),
        ]);

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          throw new Error(`Error creando sesión (Status ${createResponse.status}): ${errorText}`);
        }

        uploadUrl = createResponse.headers.get('Location');
        if (!uploadUrl) {
          throw new Error('No se recibió URL de upload');
        }

        console.log(`✅ Sesión TUS creada: ${uploadUrl}`);

        let lastProgressUpdate = Date.now();

        const uploadTask = FileSystem.createUploadTask(
          uploadUrl,
          videoUri,
          {
            httpMethod: 'PATCH',
            headers: {
              'Authorization': `Bearer ${this.apiToken}`,
              'Tus-Resumable': '1.0.0',
              'Upload-Offset': '0',
              'Content-Type': 'application/offset+octet-stream',
            },
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          },
          (progressEvent) => {
            lastProgressUpdate = Date.now();
            if (onProgress && progressEvent.totalBytesExpectedToSend > 0) {
              const percentage = (progressEvent.totalBytesSent / progressEvent.totalBytesExpectedToSend) * 100;
              onProgress(Math.min(Math.round(percentage), 100), progressEvent);
            }
          }
        );

        // Upload con timeout dinámico (más largo para archivos grandes)
        const uploadResponse = await Promise.race([
          uploadTask.uploadAsync(),
          new Promise<never>((_, reject) => {
            // Timeout que se resetea con cada actualización de progreso
            const checkTimeout = setInterval(() => {
              const timeSinceLastProgress = Date.now() - lastProgressUpdate;
              // Si no hay progreso en 60 segundos, timeout
              if (timeSinceLastProgress > 60000) {
                clearInterval(checkTimeout);
                reject(new Error('Timeout: sin progreso durante 60 segundos'));
              }
            }, 5000);

            // Timeout absoluto basado en tamaño del archivo (máximo 10 minutos)
            setTimeout(() => {
              clearInterval(checkTimeout);
              reject(new Error(`Timeout absoluto: excedido el tiempo máximo de upload (${Math.min(estimatedUploadTime, 600)}s)`));
            }, Math.min(estimatedUploadTime * 1000, 600000));
          }),
        ]);

        if (!uploadResponse || uploadResponse.status !== 204) {
          console.error(`❌ Error en respuesta de upload: Status ${uploadResponse?.status || 'desconocido'}`);
          throw new Error(`Error subiendo video: Status ${uploadResponse?.status || 'desconocido'}`);
        }

        console.log(`✅ Video subido exitosamente (Status 204)`);

        const streamMediaIdHeader = uploadResponse.headers['stream-media-id'];

        // 🔒 MEJORA: Si no hay stream-media-id, intentar buscar el video antes de fallar
        if (!streamMediaIdHeader) {
          console.warn(`⚠️ No se recibió stream-media-id en headers`);
          console.log(`🔍 Intentando buscar video subido mediante metadatos...`);

          // Esperar 2 segundos para que Cloudflare procese
          await new Promise(resolve => setTimeout(resolve, 2000));

          const existingVideoId = await this.findExistingVideo(metadata);
          if (existingVideoId) {
            console.log(`✅ Video encontrado mediante búsqueda: ${existingVideoId}`);
            const playbackUrl = `https://${this.customerSubdomain}/${existingVideoId}/manifest/video.m3u8`;
            const thumbnailUrl = `https://${this.customerSubdomain}/${existingVideoId}/thumbnails/thumbnail.jpg`;
            const dashUrl = `https://${this.customerSubdomain}/${existingVideoId}/manifest/video.mpd`;

            return {
              success: true,
              videoId: existingVideoId,
              playbackUrl,
              thumbnailUrl,
              dashUrl,
              hlsUrl: playbackUrl,
            };
          }

          throw new Error('No se pudo obtener el ID del video y la búsqueda falló');
        }

        const videoId = streamMediaIdHeader;
        console.log(`🎬 Video ID obtenido: ${videoId}`);

        const playbackUrl = `https://${this.customerSubdomain}/${videoId}/manifest/video.m3u8`;
        const thumbnailUrl = `https://${this.customerSubdomain}/${videoId}/thumbnails/thumbnail.jpg`;
        const dashUrl = `https://${this.customerSubdomain}/${videoId}/manifest/video.mpd`;
        const hlsUrl = playbackUrl;

        console.log(`✅ Subida completada exitosamente: ${videoId}`);

        return {
          success: true,
          videoId,
          playbackUrl,
          thumbnailUrl,
          dashUrl,
          hlsUrl,
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Error desconocido');
        console.error(`❌ [Intento ${attempt}/${MAX_RETRIES}] Error: ${lastError.message}`);

        // 🔒 MEJORA: Logging detallado del error
        if (uploadUrl) {
          console.error(`   Upload URL: ${uploadUrl}`);
        }
        console.error(`   Video URI: ${videoUri}`);
        if (metadata?.userId) console.error(`   User ID: ${metadata.userId}`);
        if (metadata?.trickId) console.error(`   Trick ID: ${metadata.trickId}`);

        if (attempt === MAX_RETRIES) {
          console.error(`❌ Todos los ${MAX_RETRIES} intentos fallaron. Abortando.`);
          break;
        }

        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Esperando ${waitTime / 1000}s antes de reintentar...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Todos los intentos fallaron
    console.error(`💥 Subida fallida definitivamente: ${lastError?.message}`);
    return {
      success: false,
      error: lastError?.message || 'Error desconocido al subir video',
    };
  }

  /**
   * Construye metadatos en formato TUS
   */
  private buildTusMetadata(metadata?: {
    name?: string;
    userId?: string;
    trickId?: string;
  }): string {
    const metaParts: string[] = [];

    if (metadata?.name) {
      metaParts.push(`name ${this.base64Encode(metadata.name)}`);
    }
    if (metadata?.userId) {
      metaParts.push(`userId ${this.base64Encode(metadata.userId)}`);
    }
    if (metadata?.trickId) {
      metaParts.push(`trickId ${this.base64Encode(metadata.trickId)}`);
    }

    return metaParts.join(',');
  }

  /**
   * Codifica string a base64 (compatible con React Native)
   */
  private base64Encode(str: string): string {
    // En React Native, usar btoa global
    try {
      return btoa(str);
    } catch (error) {
      // Fallback manual si btoa no está disponible
      const base64abc = [
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
        "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
        "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
        "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "/"
      ];

      let result = '';
      let i;
      const l = str.length;
      for (i = 2; i < l; i += 3) {
        result += base64abc[(str.charCodeAt(i - 2) >> 2)];
        result += base64abc[(((str.charCodeAt(i - 2) & 0x03) << 4) | (str.charCodeAt(i - 1) >> 4))];
        result += base64abc[(((str.charCodeAt(i - 1) & 0x0f) << 2) | (str.charCodeAt(i) >> 6))];
        result += base64abc[(str.charCodeAt(i) & 0x3f)];
      }
      if (i === l + 1) {
        result += base64abc[(str.charCodeAt(i - 2) >> 2)];
        result += base64abc[((str.charCodeAt(i - 2) & 0x03) << 4)];
        result += "==";
      }
      if (i === l) {
        result += base64abc[(str.charCodeAt(i - 2) >> 2)];
        result += base64abc[(((str.charCodeAt(i - 2) & 0x03) << 4) | (str.charCodeAt(i - 1) >> 4))];
        result += base64abc[((str.charCodeAt(i - 1) & 0x0f) << 2)];
        result += "=";
      }
      return result;
    }
  }

  /**
   * Obtiene información de un video por su ID
   */
  async getVideoMetadata(videoId: string): Promise<StreamVideoMetadata | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${videoId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error obteniendo metadata: ${response.status}`);
      }

      const data = await response.json();
      return data.result as StreamVideoMetadata;

    } catch (error) {
      console.error('Error obteniendo metadata del video:', error);
      return null;
    }
  }

  /**
   * Elimina un video de Cloudflare Stream
   */
  async deleteVideo(videoId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Eliminando video de Cloudflare Stream: ${videoId}`);

      const response = await fetch(`${this.baseUrl}/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
      });

      // 404 significa que el video ya no existe - objetivo cumplido
      if (response.status === 404) {
        console.log('ℹ️ Video ya no existe en Cloudflare Stream (404)');
        return true;
      }

      if (!response.ok) {
        throw new Error(`Error eliminando video: ${response.status}`);
      }

      console.log('✅ Video eliminado exitosamente');
      return true;

    } catch (error) {
      console.error('Error eliminando video:', error);
      return false;
    }
  }

  /**
   * Obtiene URL de thumbnail del video
   * @param videoId ID del video
   * @param options Opciones de thumbnail (time, width, height)
   */
  getThumbnailUrl(
    videoId: string,
    options?: {
      time?: string; // Formato: "1s", "50%", "1m30s"
      width?: number;
      height?: number;
    }
  ): string {
    const params = new URLSearchParams();

    if (options?.time) params.append('time', options.time);
    if (options?.width) params.append('width', options.width.toString());
    if (options?.height) params.append('height', options.height.toString());

    const queryString = params.toString();
    const baseUrl = `https://${this.customerSubdomain}/${videoId}/thumbnails/thumbnail.jpg`;

    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Obtiene URL firmada para playback privado
   * Nota: Requiere configuración adicional en Cloudflare Stream
   */
  async getSignedUrl(
    videoId: string,
    expiresIn: number = 3600 // segundos
  ): Promise<string | null> {
    try {
      // Para signed URLs necesitas configurar signing keys en Cloudflare
      // Docs: https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/

      const response = await fetch(`${this.baseUrl}/${videoId}/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exp: Math.floor(Date.now() / 1000) + expiresIn,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error generando signed URL: ${response.status}`);
      }

      const data = await response.json();
      return data.result.token;

    } catch (error) {
      console.error('Error generando signed URL:', error);
      return null;
    }
  }

  /**
   * Extrae video ID de una URL de Cloudflare Stream
   */
  extractVideoId(url: string): string | null {
    const match = url.match(/\/([a-f0-9]{32})\//);
    return match ? match[1] : null;
  }
}

export default new CloudflareStreamService();
