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
   * Sube un video a Cloudflare Stream usando TUS (resumable uploads)
   * Docs: https://developers.cloudflare.com/stream/uploading-videos/upload-video-file/
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
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    // Intentar hasta MAX_RETRIES veces
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const startTime = Date.now();

        if (!this.isConfigured()) {
          throw new Error('Cloudflare Stream no está configurado correctamente. Verifica CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN y CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN en .env');
        }

        console.log(`📤 Subiendo video a Cloudflare Stream (intento ${attempt}/${MAX_RETRIES})`);
        console.log(`📍 URI: ${videoUri.substring(0, 50)}...`);

        // Obtener información del archivo
        const fileInfoStart = Date.now();
        const fileInfo = await FileSystem.getInfoAsync(videoUri);
        if (!fileInfo.exists || !('size' in fileInfo)) {
          throw new Error('Archivo de video no encontrado');
        }
        console.log(`⏱️ FileInfo obtenido en ${Date.now() - fileInfoStart}ms`);

        const fileSize = fileInfo.size;
        const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        console.log(`📊 Tamaño del video: ${fileSizeMB} MB`);

        // Estimar timeout basado en tamaño (30 segundos por cada 10MB, mínimo 2 minutos)
        const estimatedUploadTime = Math.max(120, Math.ceil(fileSize / (10 * 1024 * 1024)) * 30);
        console.log(`⏱️ Timeout estimado: ${estimatedUploadTime} segundos`);

        // Paso 1: Crear upload session usando TUS protocol
        const tusEndpoint = `${this.baseUrl}?direct_user=true`;

        const tusHeaders: Record<string, string> = {
          'Authorization': `Bearer ${this.apiToken}`,
          'Tus-Resumable': '1.0.0',
          'Upload-Length': fileSize.toString(),
          'Upload-Metadata': this.buildTusMetadata(metadata),
        };

        console.log('🔑 Creando sesión TUS...');
        const tusStart = Date.now();

        // Crear la sesión de upload con timeout
        const createResponse = await Promise.race([
          fetch(tusEndpoint, {
            method: 'POST',
            headers: tusHeaders,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout al crear sesión de upload (30s)')), 30000)
          ),
        ]);

        console.log(`⏱️ Sesión TUS creada en ${Date.now() - tusStart}ms`);

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error('❌ Error en respuesta de Cloudflare:', errorText);
          throw new Error(`Error creando sesión de upload (Status ${createResponse.status}): ${errorText}`);
        }

        const uploadUrl = createResponse.headers.get('Location');
        if (!uploadUrl) {
          throw new Error('No se recibió URL de upload de Cloudflare');
        }

        console.log('✅ URL de upload:', uploadUrl.substring(0, 70) + '...');

        // Paso 2: Subir el archivo usando createUploadTask para progreso
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
            // Callback de progreso
            lastProgressUpdate = Date.now();
            if (onProgress && progressEvent.totalBytesExpectedToSend > 0) {
              const percentage = (progressEvent.totalBytesSent / progressEvent.totalBytesExpectedToSend) * 100;
              const uploadedMB = (progressEvent.totalBytesSent / (1024 * 1024)).toFixed(2);
              const totalMB = (progressEvent.totalBytesExpectedToSend / (1024 * 1024)).toFixed(2);

              onProgress(Math.min(Math.round(percentage), 100), progressEvent);

              // Log cada 10%
              if (percentage % 10 < 1) {
                console.log(`📊 Progreso: ${Math.round(percentage)}% (${uploadedMB}/${totalMB} MB)`);
              }
            }
          }
        );

        console.log('📤 Iniciando upload del archivo...');
        const uploadStart = Date.now();
        let uploadCompleteTime = 0;

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

        uploadCompleteTime = Date.now() - uploadStart;
        const uploadTimeSeconds = (uploadCompleteTime / 1000).toFixed(1);
        const uploadSpeedMBps = ((fileSize / (1024 * 1024)) / (uploadCompleteTime / 1000)).toFixed(2);

        if (!uploadResponse || uploadResponse.status !== 204) {
          const statusCode = uploadResponse?.status || 'desconocido';
          console.error(`❌ Status code inesperado: ${statusCode}`);
          throw new Error(`Error subiendo video: Status ${statusCode}`);
        }

        console.log('✅ Video subido exitosamente a Cloudflare Stream');
        console.log(`⏱️ Tiempo de upload: ${uploadTimeSeconds}s (${uploadSpeedMBps} MB/s)`);

        // Paso 3: Extraer el video ID de la respuesta
        const streamMediaIdHeader = uploadResponse.headers['stream-media-id'];

        if (!streamMediaIdHeader) {
          console.warn('⚠️ No se recibió stream-media-id en headers, intentando extraer de Location');
          const locationHeader = uploadResponse.headers['location'];
          if (locationHeader) {
            const match = locationHeader.match(/\/([a-f0-9]{32})/);
            if (match) {
              const videoId = match[1];
              console.log('🎬 Video ID extraído de Location:', videoId);
            }
          }
          throw new Error('No se pudo obtener el ID del video de Cloudflare');
        }

        const videoId = streamMediaIdHeader;
        console.log('🎬 Video ID:', videoId);

        // Paso 4: Obtener URLs de playback
        const playbackUrl = `https://${this.customerSubdomain}/${videoId}/manifest/video.m3u8`;
        const thumbnailUrl = `https://${this.customerSubdomain}/${videoId}/thumbnails/thumbnail.jpg`;
        const dashUrl = `https://${this.customerSubdomain}/${videoId}/manifest/video.mpd`;
        const hlsUrl = playbackUrl;

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log('✅ URLs generadas:', { playbackUrl, thumbnailUrl });
        console.log(`⏱️ TIEMPO TOTAL: ${totalTime}s`);

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
        console.error(`❌ Error en intento ${attempt}/${MAX_RETRIES}:`, lastError.message);

        // Si es el último intento, fallar
        if (attempt === MAX_RETRIES) {
          console.error('❌ Todos los intentos fallaron');
          break;
        }

        // Esperar antes de reintentar (backoff exponencial: 2s, 4s, 8s)
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Reintentando en ${waitTime / 1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Todos los intentos fallaron
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
