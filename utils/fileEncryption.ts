// utils/fileEncryption.ts
import { CryptoService } from "./cryptoService";
import { supabase } from "../lib/supabase";
import * as FileSystem from "expo-file-system";
import { Buffer } from "buffer";
import { OptimizedBase64 } from "./optimizedBase64";
import { performanceOptimizer } from "./performanceOptimizer";
import {
  compressionService,
  type CompressionResult,
} from "./compressionService";

export interface EncryptedFileMetadata {
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  encryptedKeys: Array<{
    userId: string;
    encryptedKey: string;
    nonce: string;
  }>;
  fileNonce: string;
  // NUEVO: Información de compresión
  compressionInfo?: {
    algorithm: "jpeg" | "h264" | "gzip" | "none";
    originalSize: number;
    compressedSize: number;
    ratio: number;
  };
}

export class FileEncryptionService {
  private cryptoService = CryptoService.getInstance();

  private async compressEncryptAndUpload(
    fileUri: string,
    fileName: string,
    mimeType: string,
    authorUserId: string,
    recipientUserIds: string[],
    getPublicKey: (userId: string) => Promise<string | null>,
    getPrivateKey: () => string,
    index: number
  ): Promise<EncryptedFileMetadata> {
    // 1. COMPRIMIR archivo
    console.log(`🗜️ Iniciando proceso para ${fileName}...`);
    const compressionResult = await compressionService.compressFile(
      fileUri,
      mimeType,
      {
        quality: 0.8, // Configurable según preferencias del usuario
        maxWidth: 1920,
        maxHeight: 1920,
      }
    );

    // 2. Usar el URI del archivo comprimido (o el original si no se comprimió)
    const finalUri = compressionResult.uri;
    const wasCompressed = compressionResult.wasCompressed;

    if (wasCompressed) {
      console.log(
        `📉 ${fileName}: ${(
          compressionResult.originalSize /
          1024 /
          1024
        ).toFixed(2)}MB → ${(
          compressionResult.compressedSize /
          1024 /
          1024
        ).toFixed(2)}MB`
      );
    }

    // 3. Continuar con el proceso existente de cifrado
    const fileDataResult = await FileSystem.readAsStringAsync(finalUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!fileDataResult || fileDataResult.length === 0) {
      throw new Error(`Archivo vacío: ${fileName}`);
    }

    // 4. Generar clave simétrica y convertir datos
    const [fileBuffer, symmetricKey] = await Promise.all([
      performanceOptimizer.measureAndOptimize(
        "base64-conversion",
        OptimizedBase64.base64ToUint8Array,
        fileDataResult
      ),
      this.cryptoService.generateSymmetricKey(),
    ]);

    // 5. Cifrar archivo
    const { encrypted, nonce } = await this.cryptoService.encryptFile(
      fileBuffer,
      symmetricKey
    );

    // 6. Cifrar claves para destinatarios
    const encryptedKeys = await this.encryptKeysForRecipients(
      symmetricKey,
      recipientUserIds,
      getPublicKey,
      getPrivateKey()
    );

    // 7. Generar ID único
    const fileId = `encrypted_${Date.now()}_${index}_${Math.random()
      .toString(36)
      .substr(2, 5)}`;
    const filePath = `encrypted_files/${fileId}`;

    // 8. Preparar metadata con información de compresión
    const metadata: EncryptedFileMetadata = {
      fileId,
      originalName: fileName,
      mimeType,
      size: wasCompressed
        ? compressionResult.compressedSize
        : fileBuffer.length,
      encryptedKeys,
      fileNonce: Buffer.from(nonce).toString("base64"),
      // NUEVO: Guardar información de compresión
      compressionInfo: wasCompressed
        ? {
            algorithm: compressionResult.algorithm,
            originalSize: compressionResult.originalSize,
            compressedSize: compressionResult.compressedSize,
            ratio: compressionResult.ratio,
          }
        : undefined,
    };

    // 9. Subir a Supabase
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("encrypted_media")
      .upload(filePath, encrypted, {
        contentType: "application/octet-stream",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `Error subiendo: ${uploadError.message || "Error desconocido"}`
      );
    }

    // 10. Guardar metadata actualizada
    await this.saveMetadataAndKeys(metadata, authorUserId);

    return metadata;
  }

  private async fastEncryptAndUpload(
    file: {
      uri: string;
      fileName: string;
      mimeType: string;
      compressionInfo?: any;
    },
    symmetricKey: Uint8Array,
    authorUserId: string,
    recipientUserIds: string[],
    getPublicKey: (userId: string) => Promise<string | null>,
    getPrivateKey: () => string,
    index: number
  ): Promise<EncryptedFileMetadata> {
    // Leer y convertir archivo (ya está comprimido si aplica)
    const fileDataBase64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // OPTIMIZACIÓN: Usar conversión directa sin medición para archivos pequeños
    const fileBuffer = await OptimizedBase64.base64ToUint8Array(fileDataBase64);

    // Cifrar (ya tenemos la clave)
    const { encrypted, nonce } = await this.cryptoService.encryptFile(
      fileBuffer,
      symmetricKey
    );

    // Cifrar claves para destinatarios (optimizado para 1 destinatario)
    const encryptedKeys =
      recipientUserIds.length === 1
        ? await this.fastEncryptKeysForSingle(
            symmetricKey,
            recipientUserIds[0],
            getPublicKey,
            getPrivateKey()
          )
        : await this.encryptKeysForRecipients(
            symmetricKey,
            recipientUserIds,
            getPublicKey,
            getPrivateKey()
          );

    // Generar ID y subir
    const fileId = `enc_${Date.now()}_${index}_${Math.random()
      .toString(36)
      .substr(2, 5)}`;
    const filePath = `encrypted_files/${fileId}`;

    // Subir con retry automático
    let uploadAttempts = 0;
    let uploadSuccess = false;

    while (uploadAttempts < 2 && !uploadSuccess) {
      try {
        const { error } = await supabase.storage
          .from("encrypted_media")
          .upload(filePath, encrypted, {
            contentType: "application/octet-stream",
            cacheControl: "3600",
            upsert: false,
          });

        if (!error) {
          uploadSuccess = true;
        } else if (uploadAttempts === 0) {
          console.warn(`Reintentando subida de ${file.fileName}...`);
          uploadAttempts++;
          await new Promise((resolve) => setTimeout(resolve, 500)); // Esperar 500ms
        } else {
          throw error;
        }
      } catch (error) {
        if (uploadAttempts === 0) {
          uploadAttempts++;
        } else {
          throw error;
        }
      }
    }

    // Metadata
    const metadata: EncryptedFileMetadata = {
      fileId,
      originalName: file.fileName,
      mimeType: file.mimeType,
      size: fileBuffer.length,
      encryptedKeys,
      fileNonce: Buffer.from(nonce).toString("base64"),
      compressionInfo: file.compressionInfo,
    };

    // Guardar metadata en background (no esperar)
    this.saveMetadataAndKeys(metadata, authorUserId).catch(console.error);

    return metadata;
  }
  private async fastEncryptKeysForSingle(
    symmetricKey: Uint8Array,
    userId: string,
    getPublicKey: (userId: string) => Promise<string | null>,
    privateKey: string
  ): Promise<Array<{ userId: string; encryptedKey: string; nonce: string }>> {
    const publicKey = await getPublicKey(userId);
    if (!publicKey) return [];

    const encryptedKeyData = await this.cryptoService.encryptSymmetricKey(
      symmetricKey,
      publicKey,
      privateKey
    );

    return [
      {
        userId,
        encryptedKey: encryptedKeyData.ciphertext,
        nonce: encryptedKeyData.nonce,
      },
    ];
  }

  // Helper para obtener tamaño total
  private async getTotalSize(files: Array<{ uri: string }>): Promise<number> {
    const sizes = await Promise.all(
      files.map(async (file) => {
        const info = await FileSystem.getInfoAsync(file.uri);
        return info.exists && "size" in info ? info.size : 0;
      })
    );
    return sizes.reduce((sum, size) => sum + size, 0);
  }
  /**
   * Batch ULTRA RÁPIDO - Procesa TODOS los archivos en paralelo con validación
   */
  async batchEncryptAndUploadFilesOptimized(
    files: Array<{ uri: string; fileName: string; mimeType: string }>,
    authorUserId: string,
    recipientUserIds: string[],
    getPublicKey: (userId: string) => Promise<string | null>,
    getPrivateKey: () => string,
    onProgress?: (progress: number, currentFile: string) => void
  ): Promise<EncryptedFileMetadata[]> {
    console.log(`🚀 Procesando ${files.length} archivos ULTRA RÁPIDO...`);
    const startTime = Date.now();

    // Verificar sesión
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error(
        "No hay sesión activa. Por favor, inicia sesión nuevamente."
      );
    }

    // OPTIMIZACIÓN 1: Separar archivos por tipo y tamaño
    const images = files.filter((f) => f.mimeType.startsWith("image/"));
    const videos = files.filter((f) => f.mimeType.startsWith("video/"));
    const others = files.filter(
      (f) =>
        !f.mimeType.startsWith("image/") && !f.mimeType.startsWith("video/")
    );

    // OPTIMIZACIÓN 2: Procesar imágenes en batch con calidad reducida para velocidad
    const processedFiles: Array<{
      uri: string;
      fileName: string;
      mimeType: string;
      compressionInfo?: any;
    }> = [];

    // Comprimir todas las imágenes en paralelo con configuración agresiva
    if (images.length > 0) {
      console.log(`📸 Comprimiendo ${images.length} imágenes en paralelo...`);

      const compressedImages = await Promise.all(
        images.map(async (img) => {
          try {
            // Comprimir más agresivamente para velocidad
            const result = await compressionService.compressFile(
              img.uri,
              img.mimeType,
              {
                quality: 0.6, // Más agresivo
                maxWidth: 1280, // Más pequeño
                maxHeight: 1280,
                forceCompress: true, // Siempre comprimir
              }
            );

            return {
              ...img,
              uri: result.uri,
              compressionInfo: result.wasCompressed
                ? {
                    algorithm: result.algorithm,
                    originalSize: result.originalSize,
                    compressedSize: result.compressedSize,
                    ratio: result.ratio,
                  }
                : undefined,
            };
          } catch (error) {
            console.error(`Error comprimiendo ${img.fileName}:`, error);
            return img; // Usar original si falla
          }
        })
      );

      processedFiles.push(...compressedImages);
    }

    // OPTIMIZACIÓN 3: Para videos, advertir al usuario o procesarlos después
    if (videos.length > 0) {
      const totalVideoSize = await this.getTotalSize(videos);

      if (totalVideoSize > 10 * 1024 * 1024) {
        // > 10MB
        console.warn(
          `⚠️ Videos grandes detectados: ${(
            totalVideoSize /
            1024 /
            1024
          ).toFixed(1)}MB`
        );
        // Opción: Subir videos después de mostrar el éxito del truco
      }

      processedFiles.push(...videos);
    }

    processedFiles.push(...others);

    // OPTIMIZACIÓN 4: Generar todas las claves simétricas de una vez
    const symmetricKeys = await Promise.all(
      processedFiles.map(() => this.cryptoService.generateSymmetricKey())
    );

    // OPTIMIZACIÓN 5: Procesar en lotes más pequeños
    const BATCH_SIZE = 3; // Procesar de 3 en 3
    const results: EncryptedFileMetadata[] = [];

    for (let i = 0; i < processedFiles.length; i += BATCH_SIZE) {
      const batch = processedFiles.slice(i, i + BATCH_SIZE);
      const batchKeys = symmetricKeys.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map((file, index) =>
          this.fastEncryptAndUpload(
            file,
            batchKeys[index],
            authorUserId,
            recipientUserIds,
            getPublicKey,
            getPrivateKey,
            i + index
          )
        )
      );

      results.push(...batchResults);

      // Actualizar progreso
      const progress = ((i + batch.length) / processedFiles.length) * 100;
      onProgress?.(progress, `Procesando...`);
    }

    const totalTime = Date.now() - startTime;
    console.log(
      `✅ Completado en ${(totalTime / 1000).toFixed(1)}s (${(
        totalTime / processedFiles.length
      ).toFixed(0)}ms por archivo)`
    );

    // Limpiar archivos temporales
    await compressionService.cleanupTemporaryFiles();

    return results;
  }

  /**
   * Versión ULTRA RÁPIDA - Con compresión opcional para archivos grandes
   */
  private async encryptAndUploadFileUltraFast(
    fileUri: string,
    fileName: string,
    mimeType: string,
    authorUserId: string,
    recipientUserIds: string[],
    getPublicKey: (userId: string) => Promise<string | null>,
    getPrivateKey: () => string,
    index: number
  ): Promise<EncryptedFileMetadata> {
    // 1. Verificar tamaño y comprimir si es necesario
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    const fileSizeMB =
      fileInfo.exists && "size" in fileInfo ? fileInfo.size / (1024 * 1024) : 0;

    let finalUri = fileUri;

    // Comprimir imágenes grandes
    if (mimeType.includes("image") && fileSizeMB > 3) {
      try {
        const { manipulateAsync, SaveFormat } = await import(
          "expo-image-manipulator"
        );
        const compressed = await manipulateAsync(
          fileUri,
          [{ resize: { width: 1920 } }],
          { compress: 0.7, format: SaveFormat.JPEG }
        );
        finalUri = compressed.uri;
        console.log(
          `📸 Comprimido ${fileName}: ${fileSizeMB.toFixed(1)}MB → ~${(
            fileSizeMB * 0.3
          ).toFixed(1)}MB`
        );
      } catch (e) {
        console.warn("No se pudo comprimir la imagen:", e);
      }
    }

    // 2. Obtener estrategia de optimización
    const fileSize = fileInfo.exists && "size" in fileInfo ? fileInfo.size : 0;
    const strategy = performanceOptimizer.getOptimizationStrategy(fileSize);

    // 3. Leer archivo y generar clave simétrica en paralelo
    const [fileDataResult, symmetricKey] = await Promise.all([
      FileSystem.readAsStringAsync(finalUri, {
        encoding: FileSystem.EncodingType.Base64,
      }),
      this.cryptoService.generateSymmetricKey(),
    ]);
    if (!fileDataResult || fileDataResult.length === 0) {
      throw new Error(`Archivo original vacío: ${fileName}`);
    }
    // 4. Convertir Base64 a Uint8Array de forma optimizada
    console.time(`base64-conversion-${fileName}`);
    const fileBuffer = await performanceOptimizer.measureAndOptimize(
      "base64ToBuffer",
      OptimizedBase64.base64ToUint8Array,
      fileDataResult
    );
    console.timeEnd(`base64-conversion-${fileName}`);
    console.log(
      `📊 ${fileName} - Tamaño original: ${fileDataResult.length} chars (base64)`
    );
    console.log(`📊 ${fileName} - Tamaño buffer: ${fileBuffer.length} bytes`);
    // 5. Cifrar archivo con medición de performance
    const encryptResult = await performanceOptimizer.measureAndOptimize(
      "encrypt",
      async (data: Uint8Array, key: Uint8Array) => {
        return this.cryptoService.encryptFile(data, key);
      },
      fileBuffer,
      symmetricKey
    );

    const { encrypted, nonce } = encryptResult;

    // 6. Cifrar claves para destinatarios en paralelo
    const encryptedKeys = await this.encryptKeysForRecipients(
      symmetricKey,
      recipientUserIds,
      getPublicKey,
      getPrivateKey()
    );
    if (!encrypted || encrypted.length === 0) {
      throw new Error(`Archivo cifrado vacío: ${fileName}`);
    }
    console.log(`🔐 ${fileName} - Tamaño cifrado: ${encrypted.length} bytes`);
    // 7. Generar ID único
    const fileId = `encrypted_${Date.now()}_${index}_${Math.random()
      .toString(36)
      .substr(2, 5)}`;
    const filePath = `encrypted_files/${fileId}`;

    // 8. Preparar metadata
    const metadata: EncryptedFileMetadata = {
      fileId,
      originalName: fileName,
      mimeType,
      size: fileBuffer.length,
      encryptedKeys,
      fileNonce: Buffer.from(nonce).toString("base64"),
    };

    // 9. Subir a Supabase con medición
    const uploadResult = await performanceOptimizer.measureAndOptimize(
      "upload",
      async (encryptedData: Uint8Array) => {
        const uploadSizeMB = encryptedData.length / (1024 * 1024);
        console.log(
          `📤 Subiendo ${fileName}: ${
            encrypted.length
          } bytes (${uploadSizeMB.toFixed(2)}MB)`
        );
        if (uploadSizeMB > 50) {
          throw new Error(
            `Archivo demasiado grande: ${uploadSizeMB.toFixed(1)}MB (máx 50MB)`
          );
        }

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("encrypted_media")
          .upload(filePath, encryptedData, {
            contentType: "application/octet-stream",
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error(`Error subiendo ${fileName}:`, uploadError);

          if (
            uploadError.message?.includes("413") ||
            uploadError.message?.includes("too large")
          ) {
            throw new Error(
              `Archivo muy grande: ${fileName} (${uploadSizeMB.toFixed(1)}MB)`
            );
          }

          if (
            uploadError.message?.includes("401") ||
            uploadError.message?.includes("JWT")
          ) {
            throw new Error(
              "Sesión expirada. Por favor, vuelve a iniciar sesión."
            );
          }

          throw new Error(
            `Error subiendo: ${uploadError.message || "Error desconocido"}`
          );
        }

        return uploadData;
      },
      encrypted
    );

    // 10. Guardar metadata (sin esperar respuesta)
    this.saveMetadataAndKeys(metadata, authorUserId).catch((error) => {
      console.error("Error guardando metadata:", error);
    });

    // 11. Log de métricas de rendimiento
    if (index === 0 || index % 5 === 0) {
      performanceOptimizer.logPerformanceReport();
    }

    return metadata;
  }

  /**
   * Cifrado simple y directo
   */
  async encryptAndUploadFile(
    fileUri: string,
    fileName: string,
    mimeType: string,
    authorUserId: string,
    recipientUserIds: string[],
    getPublicKey: (userId: string) => Promise<string | null>,
    getPrivateKey: () => string
  ): Promise<EncryptedFileMetadata> {
    return this.encryptAndUploadFileUltraFast(
      fileUri,
      fileName,
      mimeType,
      authorUserId,
      recipientUserIds,
      getPublicKey,
      getPrivateKey,
      0
    );
  }

  /**
   * Cifrar claves para destinatarios - OPTIMIZADO
   */
  private async encryptKeysForRecipients(
    symmetricKey: Uint8Array,
    recipientUserIds: string[],
    getPublicKey: (userId: string) => Promise<string | null>,
    privateKey: string
  ): Promise<Array<{ userId: string; encryptedKey: string; nonce: string }>> {
    // Si solo hay un destinatario (caso común), no usar Promise.all
    if (recipientUserIds.length === 1) {
      const publicKey = await getPublicKey(recipientUserIds[0]);
      if (!publicKey) return [];

      const encryptedKeyData = await this.cryptoService.encryptSymmetricKey(
        symmetricKey,
        publicKey,
        privateKey
      );

      return [
        {
          userId: recipientUserIds[0],
          encryptedKey: encryptedKeyData.ciphertext,
          nonce: encryptedKeyData.nonce,
        },
      ];
    }

    // Múltiples destinatarios
    const results = await Promise.all(
      recipientUserIds.map(async (userId) => {
        const publicKey = await getPublicKey(userId);
        if (!publicKey) return null;

        const encryptedKeyData = await this.cryptoService.encryptSymmetricKey(
          symmetricKey,
          publicKey,
          privateKey
        );

        return {
          userId,
          encryptedKey: encryptedKeyData.ciphertext,
          nonce: encryptedKeyData.nonce,
        };
      })
    );

    return results.filter(Boolean) as Array<{
      userId: string;
      encryptedKey: string;
      nonce: string;
    }>;
  }

  /**
   * Guardar metadata - Fire and forget para no bloquear
   */
  private async saveMetadataAndKeys(
    metadata: EncryptedFileMetadata,
    authorUserId: string
  ): Promise<void> {
    // Insertar metadata con información de compresión
    const { error: metaError } = await supabase.from("encrypted_files").insert({
      file_id: metadata.fileId,
      original_name: metadata.originalName,
      mime_type: metadata.mimeType,
      size: metadata.size,
      author_id: authorUserId,
      file_nonce: metadata.fileNonce,
      header: JSON.stringify({
        version: "1.0",
        algorithm: "nacl-secretbox",
        keyDerivation: "nacl-box",
        // NUEVO: Incluir info de compresión en el header
        compression: metadata.compressionInfo || { algorithm: "none" },
      }),
      chunks: 1,
      created_at: new Date().toISOString(),
      // NUEVO: Guardar compression_info como JSONB
      compression_info: metadata.compressionInfo || null,
    });

    if (metaError) {
      await supabase.storage
        .from("encrypted_media")
        .remove([`encrypted_files/${metadata.fileId}`]);
      throw new Error(`Error guardando metadata: ${metaError.message}`);
    }

    // Continuar con el guardado de claves...
    if (metadata.encryptedKeys.length > 0) {
      const rows = metadata.encryptedKeys.map((k) => ({
        file_id: metadata.fileId,
        user_id: k.userId,
        encrypted_key: k.encryptedKey,
        nonce: k.nonce,
        created_at: new Date().toISOString(),
      }));

      const { error: keysError } = await supabase
        .from("encrypted_file_keys")
        .insert(rows);

      if (keysError) {
        console.error("Error guardando claves:", keysError);
      }
    }
  }

  /**
   * Descargar y descifrar archivo - Sin cambios
   */
  async downloadAndDecryptFile(
    fileId: string,
    userId: string,
    getPublicKey: (userId: string) => Promise<string | null>,
    getPrivateKey: () => string
  ): Promise<{ data: Uint8Array; fileName: string; mimeType: string }> {
    // 1. Obtener metadata y clave
    const [{ data: metaData, error: mErr }, { data: keyRow, error: kErr }] =
      await Promise.all([
        supabase
          .from("encrypted_files")
          .select("*")
          .eq("file_id", fileId)
          .single(),
        supabase
          .from("encrypted_file_keys")
          .select("*")
          .eq("file_id", fileId)
          .eq("user_id", userId)
          .single(),
      ]);

    if (mErr || !metaData) throw new Error("Archivo no encontrado");
    if (kErr || !keyRow) throw new Error("Sin acceso a este archivo");

    // 2. Descifrar clave simétrica
    const authorPub = await getPublicKey(metaData.author_id);
    if (!authorPub) throw new Error("No se pudo obtener la clave del autor");

    const symmetricKey = await this.cryptoService.decryptSymmetricKey(
      { ciphertext: keyRow.encrypted_key, nonce: keyRow.nonce },
      authorPub,
      getPrivateKey()
    );

    // 3. Descargar archivo
    const { data: blob, error: dErr } = await supabase.storage
      .from("encrypted_media")
      .download(`encrypted_files/${fileId}`);

    if (dErr || !blob) throw new Error(`Error descargando: ${dErr?.message}`);

    // 4. Convertir y descifrar
    const encryptedBuffer = await this.blobToUint8Array(blob);
    const fileNonce = Buffer.from(metaData.file_nonce, "base64");

    let decrypted = await this.cryptoService.decryptFile(
      encryptedBuffer,
      fileNonce,
      symmetricKey
    );

    // 5. NUEVO: Descomprimir si fue comprimido
    if (
      metaData.compression_info?.algorithm &&
      metaData.compression_info.algorithm !== "none"
    ) {
      console.log(
        `🔓 Descomprimiendo archivo (${metaData.compression_info.algorithm})...`
      );

      // Para gzip, necesitamos descomprimir los datos
      if (metaData.compression_info.algorithm === "gzip") {
        const { default: pako } = await import("pako");
        decrypted = pako.ungzip(decrypted);
      }
      // Para jpeg/h264, los datos ya están descomprimidos (son formatos con pérdida)
    }

    return {
      data: decrypted,
      fileName: metaData.original_name,
      mimeType: metaData.mime_type,
    };
  }

  /**
   * Helper: Blob to Uint8Array
   */
  private async blobToUint8Array(
    blob: Blob | ArrayBuffer | Uint8Array
  ): Promise<Uint8Array> {
    if (blob instanceof Uint8Array) return blob;
    if (blob instanceof ArrayBuffer) return new Uint8Array(blob);

    // React Native Blob con _data
    if (blob && typeof blob === "object" && "_data" in blob) {
      const data = (blob as any)._data;

      // Si _data es un objeto con blobId y offset
      if (data && typeof data === "object" && "blobId" in data) {
        // Es un React Native Blob, usar FileReader
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) {
              const arrayBuffer = reader.result as ArrayBuffer;
              resolve(new Uint8Array(arrayBuffer));
            } else {
              reject(new Error("FileReader result is null"));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsArrayBuffer(blob as Blob);
        });
      }

      // Si _data es directamente los datos
      if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
      }
      if (typeof data === "string") {
        return await OptimizedBase64.base64ToUint8Array(data);
      }
    }

    throw new Error("No se pudo convertir el blob a Uint8Array");
  }
}
