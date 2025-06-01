// utils/fileEncryption.ts
import { CryptoService } from "./cryptoService";
import { supabase } from "../lib/supabase";
import * as FileSystem from "expo-file-system";
import { Buffer } from "buffer";
import { OptimizedBase64 } from "./optimizedBase64";
import { performanceOptimizer } from "./performanceOptimizer";

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
}

export class FileEncryptionService {
  private cryptoService = CryptoService.getInstance();

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
    console.log(`🚀 Procesando ${files.length} archivos EN PARALELO TOTAL...`);
    const startTime = Date.now();

    // Verificar sesión antes de empezar
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error(
        "No hay sesión activa. Por favor, inicia sesión nuevamente."
      );
    }

    // Verificar tamaños de archivos primero
    const fileSizes = await Promise.all(
      files.map(async (file) => {
        const info = await FileSystem.getInfoAsync(file.uri);
        const sizeMB =
          info.exists && "size" in info ? info.size / (1024 * 1024) : 0;
        return { ...file, sizeMB };
      })
    );

    // Verificar archivos muy grandes
    const largeFiles = fileSizes.filter((f) => f.sizeMB > 20);
    if (largeFiles.length > 0) {
      console.warn(
        "⚠️ Archivos grandes detectados:",
        largeFiles.map((f) => `${f.fileName}: ${f.sizeMB.toFixed(1)}MB`)
      );
    }

    let processedCount = 0;
    const totalFiles = files.length;

    // Procesar TODOS los archivos en paralelo sin importar el tamaño
    const promises = files.map((file, index) =>
      this.encryptAndUploadFileUltraFast(
        file.uri,
        file.fileName,
        file.mimeType,
        authorUserId,
        recipientUserIds,
        getPublicKey,
        getPrivateKey,
        index // Para evitar colisiones de ID
      )
        .then((result) => {
          processedCount++;
          onProgress?.((processedCount / totalFiles) * 100, file.fileName);
          console.log(`✅ ${file.fileName} completado`);
          return result;
        })
        .catch((error) => {
          console.error(`❌ Error con ${file.fileName}:`, error);
          processedCount++;
          onProgress?.((processedCount / totalFiles) * 100, file.fileName);

          // Re-throw para propagar el error
          throw new Error(
            `Error procesando ${file.fileName}: ${error.message}`
          );
        })
    );

    try {
      // Usar Promise.allSettled para obtener todos los resultados
      const results = await Promise.allSettled(promises);

      const successful: EncryptedFileMetadata[] = [];
      const failed: string[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          successful.push(result.value);
        } else if (result.status === "rejected") {
          failed.push(
            `${files[index].fileName}: ${
              result.reason?.message || "Error desconocido"
            }`
          );
        }
      });

      const totalTime = Date.now() - startTime;
      console.log(
        `✅ Procesados ${successful.length}/${files.length} en ${(
          totalTime / 1000
        ).toFixed(1)}s`
      );

      if (failed.length > 0) {
        console.error("❌ Archivos que fallaron:", failed);
        throw new Error(
          `Error al procesar ${failed.length} archivo(s): ${failed.join(", ")}`
        );
      }

      return successful;
    } catch (error) {
      console.error("Error en batch upload:", error);
      throw error;
    }
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
        console.log(`📤 Subiendo ${fileName}: ${encrypted.length} bytes (${uploadSizeMB.toFixed(2)}MB)`);
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
    // Insertar metadata
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
      }),
      chunks: 1,
      created_at: new Date().toISOString(),
    });

    if (metaError) {
      // Intentar limpiar el archivo subido
      await supabase.storage
        .from("encrypted_media")
        .remove([`encrypted_files/${metadata.fileId}`]);
      throw new Error(`Error guardando metadata: ${metaError.message}`);
    }

    // Insertar claves
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
    // 1. Obtener metadata y clave en paralelo
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

    const decrypted = await this.cryptoService.decryptFile(
      encryptedBuffer,
      fileNonce,
      symmetricKey
    );

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
