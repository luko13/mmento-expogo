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
  compressionInfo?: {
    algorithm: "jpeg" | "h264" | "gzip" | "none";
    originalSize: number;
    compressedSize: number;
    ratio: number;
  };
}

export class FileEncryptionService {
  private cryptoService = CryptoService.getInstance();

  /**
   * Helper para subir archivo cifrado a Supabase en React Native
   */
  private async uploadEncryptedFile(
    encrypted: Uint8Array,
    filePath: string
  ): Promise<void> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("No hay sesión activa");
    
    console.log("📤 Upload - encrypted.length:", encrypted.length);
    console.log("📤 Upload - primeros 20 bytes:", encrypted.slice(0, 20));
    console.log("📤 Upload - últimos 20 bytes:", encrypted.slice(-20));
    
    // Subir directamente el Uint8Array
    const { error } = await supabase.storage
      .from("encrypted_media")
      .upload(filePath, encrypted, {
        contentType: "application/octet-stream",
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

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
    const compressionResult = await compressionService.compressFile(
      fileUri,
      mimeType,
      {
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
      }
    );

    const finalUri = compressionResult.uri;
    const wasCompressed = compressionResult.wasCompressed;

    if (wasCompressed) {
      console.log(`✅ Archivo comprimido: ${compressionResult.originalSize} -> ${compressionResult.compressedSize}`);
    }

    // 2. Leer archivo
    const fileDataResult = await FileSystem.readAsStringAsync(finalUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!fileDataResult || fileDataResult.length === 0) {
      throw new Error(`Archivo vacío: ${fileName}`);
    }

    // 3. Generar clave simétrica y convertir datos
    const [fileBuffer, symmetricKey] = await Promise.all([
      performanceOptimizer.measureAndOptimize(
        "base64-conversion",
        OptimizedBase64.base64ToUint8Array,
        fileDataResult
      ),
      this.cryptoService.generateSymmetricKey(),
    ]);

    // 4. Cifrar archivo
    const { encrypted, nonce } = await this.cryptoService.encryptFile(
      fileBuffer,
      symmetricKey
    );

    // 5. Cifrar claves para destinatarios
    const encryptedKeys = await this.encryptKeysForRecipients(
      symmetricKey,
      recipientUserIds,
      getPublicKey,
      getPrivateKey()
    );

    // 6. Generar ID único
    const fileId = `enc_${Date.now()}_${index}_${Math.random()
      .toString(36)
      .substr(2, 5)}`;
    const filePath = `encrypted_files/${fileId}`;

    // 7. Preparar metadata
    const metadata: EncryptedFileMetadata = {
      fileId,
      originalName: fileName,
      mimeType,
      size: wasCompressed
        ? compressionResult.compressedSize
        : fileBuffer.length,
      encryptedKeys,
      fileNonce: Buffer.from(nonce).toString("base64"),
      compressionInfo: wasCompressed
        ? {
            algorithm: compressionResult.algorithm,
            originalSize: compressionResult.originalSize,
            compressedSize: compressionResult.compressedSize,
            ratio: compressionResult.ratio,
          }
        : undefined,
    };

    // 8. Subir usando método compatible con React Native
    await this.uploadEncryptedFile(encrypted, filePath);

    // 9. Guardar metadata
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
    // Leer archivo
    const fileDataBase64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const fileBuffer = await OptimizedBase64.base64ToUint8Array(fileDataBase64);

    // Cifrar
    const { encrypted, nonce } = await this.cryptoService.encryptFile(
      fileBuffer,
      symmetricKey
    );

    // Cifrar claves
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
    
    console.log("📊 Tamaños ANTES de upload:");
    console.log("- fileBuffer.length:", fileBuffer.length);
    console.log("- encrypted.length:", encrypted.length);
    console.log("- nonce.length:", nonce.length);
    
    // Generar ID
    const fileId = `enc_${Date.now()}_${index}_${Math.random()
      .toString(36)
      .substr(2, 5)}`;
    const filePath = `encrypted_files/${fileId}`;

    // Subir con retry
    let uploadAttempts = 0;
    let uploadSuccess = false;

    while (uploadAttempts < 2 && !uploadSuccess) {
      try {
        await this.uploadEncryptedFile(encrypted, filePath);
        uploadSuccess = true;
      } catch (error) {
        if (uploadAttempts === 0) {
          uploadAttempts++;
          await new Promise((resolve) => setTimeout(resolve, 500));
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

    // Guardar metadata en background
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

  private async getTotalSize(files: Array<{ uri: string }>): Promise<number> {
    const sizes = await Promise.all(
      files.map(async (file) => {
        const info = await FileSystem.getInfoAsync(file.uri);
        return info.exists && "size" in info ? info.size : 0;
      })
    );
    return sizes.reduce((sum, size) => sum + size, 0);
  }

  async batchEncryptAndUploadFilesOptimized(
    files: Array<{ uri: string; fileName: string; mimeType: string }>,
    authorUserId: string,
    recipientUserIds: string[],
    getPublicKey: (userId: string) => Promise<string | null>,
    getPrivateKey: () => string,
    onProgress?: (progress: number, currentFile: string) => void
  ): Promise<EncryptedFileMetadata[]> {
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

    // Separar archivos por tipo
    const images = files.filter((f) => f.mimeType.startsWith("image/"));
    const videos = files.filter((f) => f.mimeType.startsWith("video/"));
    const others = files.filter(
      (f) =>
        !f.mimeType.startsWith("image/") && !f.mimeType.startsWith("video/")
    );

    const processedFiles: Array<{
      uri: string;
      fileName: string;
      mimeType: string;
      compressionInfo?: any;
    }> = [];

    // Comprimir imágenes en paralelo
    if (images.length > 0) {
      const compressedImages = await Promise.all(
        images.map(async (img) => {
          try {
            const result = await compressionService.compressFile(
              img.uri,
              img.mimeType,
              {
                quality: 0.6,
                maxWidth: 1280,
                maxHeight: 1280,
                forceCompress: true,
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
            return img;
          }
        })
      );

      processedFiles.push(...compressedImages);
    }

    // Advertir sobre videos grandes
    if (videos.length > 0) {
      const totalVideoSize = await this.getTotalSize(videos);
      if (totalVideoSize > 10 * 1024 * 1024) {
        console.warn(
          `⚠️ Videos grandes: ${(totalVideoSize / 1024 / 1024).toFixed(1)}MB`
        );
      }
      processedFiles.push(...videos);
    }

    processedFiles.push(...others);

    // Generar claves simétricas
    const symmetricKeys = await Promise.all(
      processedFiles.map(() => this.cryptoService.generateSymmetricKey())
    );

    // Procesar en lotes
    const BATCH_SIZE = 3;
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

      const progress = ((i + batch.length) / processedFiles.length) * 100;
      onProgress?.(progress, `Procesando...`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Batch upload completado en ${(totalTime / 1000).toFixed(2)}s`);

    await compressionService.cleanupTemporaryFiles();

    return results;
  }

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
    // Verificar tamaño y comprimir si es necesario
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
      } catch (e) {
        console.warn("Error comprimiendo imagen:", e);
      }
    }

    // Leer archivo y generar clave
    const [fileDataResult, symmetricKey] = await Promise.all([
      FileSystem.readAsStringAsync(finalUri, {
        encoding: FileSystem.EncodingType.Base64,
      }),
      this.cryptoService.generateSymmetricKey(),
    ]);

    if (!fileDataResult || fileDataResult.length === 0) {
      throw new Error(`Archivo vacío: ${fileName}`);
    }

    // Convertir y cifrar
    const fileBuffer = await OptimizedBase64.base64ToUint8Array(fileDataResult);
    const { encrypted, nonce } = await this.cryptoService.encryptFile(
      fileBuffer,
      symmetricKey
    );

    // Cifrar claves
    const encryptedKeys = await this.encryptKeysForRecipients(
      symmetricKey,
      recipientUserIds,
      getPublicKey,
      getPrivateKey()
    );

    if (!encrypted || encrypted.length === 0) {
      throw new Error(`Archivo cifrado vacío: ${fileName}`);
    }

    // Generar ID
    const fileId = `enc_${Date.now()}_${index}_${Math.random()
      .toString(36)
      .substr(2, 5)}`;
    const filePath = `encrypted_files/${fileId}`;

    // Metadata
    const metadata: EncryptedFileMetadata = {
      fileId,
      originalName: fileName,
      mimeType,
      size: fileBuffer.length,
      encryptedKeys,
      fileNonce: Buffer.from(nonce).toString("base64"),
    };

    // Subir
    const uploadSizeMB = encrypted.length / (1024 * 1024);

    if (uploadSizeMB > 50) {
      throw new Error(
        `Archivo demasiado grande: ${uploadSizeMB.toFixed(1)}MB (máx 50MB)`
      );
    }

    await this.uploadEncryptedFile(encrypted, filePath);

    // Guardar metadata
    this.saveMetadataAndKeys(metadata, authorUserId).catch(console.error);

    return metadata;
  }

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

  private async encryptKeysForRecipients(
    symmetricKey: Uint8Array,
    recipientUserIds: string[],
    getPublicKey: (userId: string) => Promise<string | null>,
    privateKey: string
  ): Promise<Array<{ userId: string; encryptedKey: string; nonce: string }>> {
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

  private async saveMetadataAndKeys(
    metadata: EncryptedFileMetadata,
    authorUserId: string
  ): Promise<void> {
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
        compression: metadata.compressionInfo || { algorithm: "none" },
      }),
      chunks: 1,
      created_at: new Date().toISOString(),
      compression_info: metadata.compressionInfo || null,
    });

    if (metaError) {
      await supabase.storage
        .from("encrypted_media")
        .remove([`encrypted_files/${metadata.fileId}`]);
      throw new Error(`Error guardando metadata: ${metaError.message}`);
    }

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

  async downloadAndDecryptFile(
    fileId: string,
    userId: string,
    getPublicKey: (userId: string) => Promise<string | null>,
    getPrivateKey: () => string
  ): Promise<{ data: Uint8Array; fileName: string; mimeType: string }> {
    console.log(`📥 Iniciando descarga de archivo: ${fileId}`);
    
    // Obtener metadata y clave
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

    console.log(`📥 Metadata obtenida - Tamaño original: ${metaData.size}`);

    // Descifrar clave simétrica
    const authorPub = await getPublicKey(metaData.author_id);
    if (!authorPub) throw new Error("No se pudo obtener la clave del autor");

    const symmetricKey = await this.cryptoService.decryptSymmetricKey(
      { ciphertext: keyRow.encrypted_key, nonce: keyRow.nonce },
      authorPub,
      getPrivateKey()
    );

    console.log("🔐 Clave simétrica descifrada - length:", symmetricKey.length);

    // Descargar archivo
    const filePath = `encrypted_files/${fileId}`;
    const { data: blob, error: dErr } = await supabase.storage
      .from("encrypted_media")
      .download(filePath);

    if (dErr || !blob) {
      throw new Error(`Error descargando: ${dErr?.message}`);
    }

    // Convertir blob a Uint8Array
    const encryptedBuffer = await this.blobToUint8Array(blob);

    console.log("📥 Download - blob type:", typeof blob);
    console.log("📥 Download - blob size:", blob.size);
    console.log("📥 Download - encryptedBuffer.length:", encryptedBuffer.length);
    console.log("📥 Download - primeros 20 bytes:", Array.from(encryptedBuffer.slice(0, 20)));
    console.log("📥 Download - últimos 20 bytes:", Array.from(encryptedBuffer.slice(-20)));

    // IMPORTANTE: TweetNaCl secretbox agrega 16 bytes de overhead
    const NACL_OVERHEAD = 16;
    const expectedSizeWithOverhead = metaData.size + NACL_OVERHEAD;
    
    if (encryptedBuffer.length !== expectedSizeWithOverhead && encryptedBuffer.length !== metaData.size) {
      console.warn(`⚠️ Tamaño inesperado. Esperado: ${expectedSizeWithOverhead} o ${metaData.size}, Recibido: ${encryptedBuffer.length}`);
      console.warn(`⚠️ Diferencia: ${encryptedBuffer.length - metaData.size} bytes`);
      // No fallar, intentar descifrar de todos modos
    }

    // Descifrar
    const fileNonce = Buffer.from(metaData.file_nonce, "base64");
    console.log("🔐 Descifrado - nonce:", Buffer.from(fileNonce).toString('hex'));
    
    let decrypted: Uint8Array;
    try {
      decrypted = await this.cryptoService.decryptFile(
        encryptedBuffer, // Usar el buffer completo, nacl.secretbox.open manejará el overhead
        fileNonce,
        symmetricKey
      );
      console.log("✅ Archivo descifrado correctamente - tamaño:", decrypted.length);
    } catch (error) {
      console.error("❌ Error descifrando archivo:", error);
      throw new Error("Error al descifrar el archivo. Verifique las claves.");
    }

    // Descomprimir si es necesario
    if (metaData.compression_info?.algorithm === "gzip") {
      console.log("📦 Descomprimiendo archivo gzip...");
      const { default: pako } = await import("pako");
      decrypted = pako.ungzip(decrypted);
      console.log("✅ Archivo descomprimido - tamaño final:", decrypted.length);
    }

    return {
      data: decrypted,
      fileName: metaData.original_name,
      mimeType: metaData.mime_type,
    };
  }

  private async blobToUint8Array(
    blob: Blob | ArrayBuffer | Uint8Array | any
  ): Promise<Uint8Array> {
    if (blob instanceof Uint8Array) return blob;
    if (blob instanceof ArrayBuffer) return new Uint8Array(blob);

    // Para React Native
    if (blob instanceof Blob) {
      try {
        const response = await fetch(blob as any);
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } catch (e) {
        // Fallback: FileReader
        if (typeof FileReader !== "undefined") {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (reader.result) {
                resolve(new Uint8Array(reader.result as ArrayBuffer));
              } else {
                reject(new Error("FileReader result is null"));
              }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(blob);
          });
        }
      }
    }

    throw new Error(`No se pudo convertir blob a Uint8Array`);
  }
}