// utils/fileEncryption.ts
import { CryptoService } from "./cryptoService";
import { supabase } from "../lib/supabase";
import * as FileSystem from "expo-file-system";
import { workerManager } from "./workerManager";
import { Buffer } from "buffer";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as VideoThumbnails from "expo-video-thumbnails";
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
  private readonly CHUNK_SIZE = 512 * 1024; // 512KB chunks
  // overhead fijo de nacl-secretbox (16 bytes)
  private static readonly SECRETBOX_OVERHEAD = 16;
  /**
   * Encrypt large files with optimized strategy
   */
  private async encryptLargeFileOptimized(
    fileUri: string,
    fileSize: number,
    symmetricKey: Uint8Array,
    strategy: any
  ): Promise<{ encrypted: Uint8Array; nonce: Uint8Array }> {
    const nonce = await this.cryptoService.generateNonce();
    const CHUNK_SIZE = strategy.chunkSize || this.CHUNK_SIZE;
    const PARALLEL_CHUNKS = strategy.parallelChunks || 3;
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

    console.log(
      `📦 Procesando ${totalChunks} chunks de ${(CHUNK_SIZE / 1024).toFixed(
        0
      )}KB con ${PARALLEL_CHUNKS} en paralelo`
    );

    // Process chunks with optimized parallelism
    const encryptedChunks: Uint8Array[] = new Array(totalChunks);

    for (let i = 0; i < totalChunks; i += PARALLEL_CHUNKS) {
      const batchStart = Date.now();
      const batch = [];

      for (let j = 0; j < PARALLEL_CHUNKS && i + j < totalChunks; j++) {
        const chunkIndex = i + j;
        const offset = chunkIndex * CHUNK_SIZE;
        const length = Math.min(CHUNK_SIZE, fileSize - offset);

        batch.push({
          index: chunkIndex,
          promise: this.processStreamChunk(
            fileUri,
            offset,
            length,
            { key: symmetricKey, nonce, counter: 0 },
            chunkIndex
          ),
        });
      }

      const results = await Promise.all(
        batch.map(async ({ index, promise }) => ({
          index,
          data: await promise,
        }))
      );

      results.forEach(({ index, data }) => {
        encryptedChunks[index] = data;
      });

      const progress = Math.min((i + batch.length) / totalChunks, 1);
      console.log(
        `📊 Progreso: ${(progress * 100).toFixed(0)}% - Batch en ${
          Date.now() - batchStart
        }ms`
      );
    }

    // Combine chunks
    const totalLength = encryptedChunks.reduce(
      (sum, chunk) => sum + chunk.length,
      0
    );
    const encrypted = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of encryptedChunks) {
      encrypted.set(chunk, offset);
      offset += chunk.length;
    }

    return { encrypted, nonce };
  }

  /**
   * Upload encrypted file as separate method for performance tracking
   */
  private async uploadEncryptedFile(
    encrypted: Uint8Array,
    filePath: string,
    nonce: Uint8Array,
    fileId: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
    encryptedKeys: Array<{
      userId: string;
      encryptedKey: string;
      nonce: string;
    }>,
    authorUserId: string
  ): Promise<EncryptedFileMetadata> {
    // Convert to base64 using worker
    const encryptedBase64 = await workerManager.bufferToBase64(encrypted);

    // Convert to ArrayBuffer for Supabase
    const uploadBuffer = Buffer.from(encryptedBase64, "base64").buffer;

    const { error: uploadError } = await supabase.storage
      .from("encrypted_media")
      .upload(filePath, uploadBuffer, {
        contentType: "application/octet-stream",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Error subiendo archivo: ${uploadError.message}`);
    }

    // Create metadata
    const metadata: EncryptedFileMetadata = {
      fileId,
      originalName: fileName,
      mimeType,
      size: fileSize,
      encryptedKeys,
      fileNonce: await workerManager.bufferToBase64(nonce),
    };

    // Save metadata and keys
    await this.saveMetadataAndKeys(metadata, authorUserId);

    return metadata;
  }

  /**
   * Smart compression before encryption
   */
  async smartCompress(uri: string, mimeType: string): Promise<string> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists || !("size" in fileInfo)) return uri;

      const fileSize = fileInfo.size;

      // Videos: compress if > 10MB
      if (mimeType.includes("video") && fileSize > 10 * 1024 * 1024) {
        console.log("🎬 Compressing video...");
        // Note: React Native doesn't have built-in video compression
        // You'll need to use a library like react-native-video-processing
        // For now, we'll generate a thumbnail as placeholder
        try {
          const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(
            uri,
            {
              time: 0,
              quality: 0.8,
            }
          );
          console.log("📸 Generated video thumbnail for preview");
          // In production, use actual video compression library
          return uri; // Return original for now
        } catch (error) {
          console.error("Error generating video thumbnail:", error);
          return uri;
        }
      }

      // Images: compress if > 2MB
      if (mimeType.includes("image") && fileSize > 2 * 1024 * 1024) {
        console.log("🖼️ Compressing image...");
        const compressed = await manipulateAsync(
          uri,
          [{ resize: { width: 1920, height: 1080 } }],
          {
            compress: 0.8,
            format: SaveFormat.JPEG,
          }
        );
        console.log(
          `✅ Image compressed: ${(fileSize / 1024 / 1024).toFixed(2)}MB → ~${(
            (fileSize * 0.3) /
            1024 /
            1024
          ).toFixed(2)}MB`
        );
        return compressed.uri;
      }

      return uri;
    } catch (error) {
      console.error("Error in smart compression:", error);
      return uri; // Return original on error
    }
  }

  /**
   * Encrypts and uploads a file with optimizations
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
    const startTime = Date.now();

    try {
      // 1. Verificar autenticación
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Usuario no autenticado");
      }

      // 2. Compress file if needed
      const compressedUri = await performanceOptimizer.measureAndOptimize(
        "compress",
        this.smartCompress.bind(this),
        fileUri,
        mimeType
      );

      // 3. Generate symmetric key
      const symmetricKey = await this.cryptoService.generateSymmetricKey();

      // 4. Read file info
      const fileInfo = await FileSystem.getInfoAsync(compressedUri);
      if (!fileInfo.exists) {
        throw new Error("Archivo no encontrado");
      }

      const fileSize = "size" in fileInfo ? fileInfo.size : 0;
      console.log(
        `📁 Procesando archivo: ${fileName} (${(fileSize / 1024 / 1024).toFixed(
          2
        )}MB)`
      );

      // 5. Get optimization strategy
      const strategy = performanceOptimizer.getOptimizationStrategy(fileSize);

      // 6. Determine encryption strategy based on performance metrics
      let encrypted: Uint8Array;
      let nonce: Uint8Array;

      if (strategy.useStreaming) {
        console.log("🚀 Usando cifrado por chunks optimizado");
        const result = await performanceOptimizer.measureAndOptimize(
          "encrypt",
          this.encryptLargeFileOptimized.bind(this),
          compressedUri,
          fileSize,
          symmetricKey,
          strategy
        );
        encrypted = result.encrypted;
        nonce = result.nonce;
      } else {
        // Small file - read all at once but use worker for conversion
        console.time("→ lectura");
        const fileData = await FileSystem.readAsStringAsync(compressedUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.timeEnd("→ lectura");

        console.time("→ conversión base64");
        const fileBuffer = await workerManager.base64ToBuffer(fileData);
        console.timeEnd("→ conversión base64");

        const encryptResult = await performanceOptimizer.measureAndOptimize(
          "encrypt",
          this.cryptoService.encryptFile.bind(this.cryptoService),
          fileBuffer,
          symmetricKey
        );
        encrypted = encryptResult.encrypted;
        nonce = encryptResult.nonce;
      }

      // 7. Encrypt symmetric key for recipients in parallel
      console.time("→ cifrado de claves");
      const privateKey = getPrivateKey();
      const encryptedKeys = await this.encryptKeysForRecipients(
        symmetricKey,
        recipientUserIds,
        getPublicKey,
        privateKey
      );
      console.timeEnd("→ cifrado de claves");

      // 8. Upload encrypted file with performance tracking
      const fileId = `encrypted_${Date.now()}_${authorUserId}`;
      const filePath = `encrypted_files/${fileId}`;

      const metadata = await performanceOptimizer.measureAndOptimize(
        "upload",
        this.uploadEncryptedFile.bind(this),
        encrypted,
        filePath,
        nonce,
        fileId,
        fileName,
        mimeType,
        fileSize,
        encryptedKeys,
        authorUserId
      );

      const totalTime = Date.now() - startTime;
      console.log(
        `✅ Archivo cifrado y subido en ${(totalTime / 1000).toFixed(2)}s`
      );

      // Log performance report periodically
      if (Math.random() < 0.1) {
        // 10% chance
        performanceOptimizer.logPerformanceReport();
      }

      return metadata;
    } catch (error) {
      console.error("Error cifrando y subiendo archivo:", error);
      throw error;
    }
  }

  /**
   * Optimized batch upload with smart batching and parallel processing
   */
  async batchEncryptAndUploadFilesOptimized(
    files: Array<{ uri: string; fileName: string; mimeType: string }>,
    authorUserId: string,
    recipientUserIds: string[],
    getPublicKey: (userId: string) => Promise<string | null>,
    getPrivateKey: () => string,
    onProgress?: (progress: number, currentFile: string) => void
  ): Promise<EncryptedFileMetadata[]> {
    const SMALL_FILE_THRESHOLD = 500 * 1024; // 500KB
    const MEDIUM_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB
    const MIN_BATCH_SIZE = 4;

    // Analyze files
    const fileAnalysis = await this.analyzeFiles(files);

    // Group files by size and type
    const { smallPhotos, smallVideos, mediumFiles, largeFiles } =
      this.groupFilesBySizeAndType(fileAnalysis);

    const results: EncryptedFileMetadata[] = [];
    let processedCount = 0;

    // Strategy 1: Combine small photos into archive
    if (smallPhotos.length >= MIN_BATCH_SIZE) {
      console.log(
        `📦 Combining ${smallPhotos.length} small photos into archive`
      );

      try {
        const archiveResult = await this.createAndEncryptArchive(
          smallPhotos,
          authorUserId,
          recipientUserIds,
          getPublicKey,
          getPrivateKey
        );
        results.push(archiveResult);
        processedCount += smallPhotos.length;
        onProgress?.((processedCount / files.length) * 100, "photo_archive");
      } catch (error) {
        console.error(
          "Archive creation failed, falling back to individual uploads",
          error
        );
        // Fallback to individual processing
        const photoResults = await this.processFilesInParallel(
          smallPhotos,
          3, // More parallel for small files
          authorUserId,
          recipientUserIds,
          getPublicKey,
          getPrivateKey,
          (progress, fileName) => {
            processedCount += progress;
            onProgress?.((processedCount / files.length) * 100, fileName);
          }
        );
        results.push(...photoResults);
      }
    } else if (smallPhotos.length > 0) {
      // Process small photos individually if not enough for archive
      const photoResults = await this.processFilesInParallel(
        smallPhotos,
        3,
        authorUserId,
        recipientUserIds,
        getPublicKey,
        getPrivateKey,
        (progress, fileName) => {
          processedCount += progress;
          onProgress?.((processedCount / files.length) * 100, fileName);
        }
      );
      results.push(...photoResults);
    }

    // Strategy 2: Process small videos with moderate parallelism (no archive due to size)
    if (smallVideos.length > 0) {
      console.log(`🎬 Processing ${smallVideos.length} small videos`);

      const videoResults = await this.processFilesInParallel(
        smallVideos,
        2, // Less parallelism for videos
        authorUserId,
        recipientUserIds,
        getPublicKey,
        getPrivateKey,
        (progress, fileName) => {
          processedCount += progress;
          onProgress?.((processedCount / files.length) * 100, fileName);
        }
      );
      results.push(...videoResults);
    }

    // Strategy 3: Process medium files with optimal parallelism
    if (mediumFiles.length > 0) {
      console.log(
        `🚀 Processing ${mediumFiles.length} medium files in parallel`
      );

      const mediumResults = await this.processFilesInParallel(
        mediumFiles,
        2, // Balanced parallelism
        authorUserId,
        recipientUserIds,
        getPublicKey,
        getPrivateKey,
        (progress, fileName) => {
          processedCount += progress;
          onProgress?.((processedCount / files.length) * 100, fileName);
        }
      );
      results.push(...mediumResults);
    }

    // Strategy 4: Process large files sequentially with streaming
    if (largeFiles.length > 0) {
      console.log(
        `📡 Processing ${largeFiles.length} large files with streaming`
      );

      for (const file of largeFiles) {
        const startTime = Date.now();

        const result = await this.encryptAndUploadFile(
          file.uri,
          file.fileName,
          file.mimeType,
          authorUserId,
          recipientUserIds,
          getPublicKey,
          getPrivateKey
        );

        results.push(result);
        processedCount++;

        const duration = Date.now() - startTime;
        console.log(
          `✅ ${file.fileName} processed in ${(duration / 1000).toFixed(2)}s`
        );

        onProgress?.((processedCount / files.length) * 100, file.fileName);
      }
    }

    return results;
  }

  /**
   * Encrypt large files using streaming with improved chunk processing
   */
  private async encryptLargeFile(
    fileUri: string,
    fileSize: number,
    symmetricKey: Uint8Array,
    onProgress?: (progress: number) => void
  ): Promise<{ encrypted: Uint8Array; nonce: Uint8Array }> {
    const nonce = await this.cryptoService.generateNonce();
    const PARALLEL_CHUNKS = 3;
    const totalChunks = Math.ceil(fileSize / this.CHUNK_SIZE);

    console.log(
      `📦 Procesando ${totalChunks} chunks de ${(
        this.CHUNK_SIZE / 1024
      ).toFixed(0)}KB`
    );

    // Stream cipher state for sequential chunks
    const streamState = {
      key: symmetricKey,
      nonce: nonce,
      counter: 0,
    };

    // Process chunks in streaming mode
    const encryptedChunks: Uint8Array[] = new Array(totalChunks);

    for (let i = 0; i < totalChunks; i += PARALLEL_CHUNKS) {
      const batchStart = Date.now();
      const batch = [];

      // Create batch of chunk promises
      for (let j = 0; j < PARALLEL_CHUNKS && i + j < totalChunks; j++) {
        const chunkIndex = i + j;
        const offset = chunkIndex * this.CHUNK_SIZE;
        const length = Math.min(this.CHUNK_SIZE, fileSize - offset);

        batch.push({
          index: chunkIndex,
          promise: this.processStreamChunk(
            fileUri,
            offset,
            length,
            streamState,
            chunkIndex
          ),
        });
      }

      // Process batch in parallel
      const results = await Promise.all(
        batch.map(async ({ index, promise }) => ({
          index,
          data: await promise,
        }))
      );

      // Store results in correct order
      results.forEach(({ index, data }) => {
        encryptedChunks[index] = data;
      });

      // Progress callback
      const progress = Math.min((i + batch.length) / totalChunks, 1);
      console.log(
        `📊 Progreso: ${(progress * 100).toFixed(0)}% - Batch en ${
          Date.now() - batchStart
        }ms`
      );
      onProgress?.(progress);
    }

    // Combine chunks efficiently
    const totalLength = encryptedChunks.reduce(
      (sum, chunk) => sum + chunk.length,
      0
    );
    const encrypted = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of encryptedChunks) {
      encrypted.set(chunk, offset);
      offset += chunk.length;
    }

    return { encrypted, nonce };
  }

  /**
   * Process a single chunk with stream cipher
   */
  private async processStreamChunk(
    fileUri: string,
    offset: number,
    length: number,
    streamState: { key: Uint8Array; nonce: Uint8Array; counter: number },
    chunkIndex: number
  ): Promise<Uint8Array> {
    try {
      // Read chunk - FileSystem API might not support position/length in React Native
      const chunkData = await this.readFileChunk(fileUri, offset, length);

      // Convert using worker
      const chunkBuffer = await workerManager.base64ToBuffer(chunkData);

      // Create chunk-specific nonce for parallel processing
      const chunkNonce = this.deriveChunkNonce(streamState.nonce, chunkIndex);

      // Encrypt chunk
      const { encrypted } = await this.cryptoService.encryptFile(
        chunkBuffer,
        streamState.key
      );
      return encrypted;
    } catch (error) {
      console.error(`Error processing chunk ${chunkIndex}:`, error);
      throw error;
    }
  }

  /**
   * Read file chunk with fallback for React Native
   */
  private async readFileChunk(
    fileUri: string,
    offset: number,
    length: number
  ): Promise<string> {
    try {
      // Try with position/length (may not work in all React Native versions)
      return await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
        position: offset,
        length,
      });
    } catch (error) {
      // Fallback: read entire file and slice (less efficient but works)
      console.warn("Chunk reading not supported, using fallback method");
      const fullFile = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Calculate base64 slice positions
      const base64ChunkSize = Math.ceil((length * 4) / 3);
      const base64Offset = Math.floor((offset * 4) / 3);

      return fullFile.slice(base64Offset, base64Offset + base64ChunkSize);
    }
  }

  /**
   * Derive unique nonce for each chunk
   */
  private deriveChunkNonce(
    baseNonce: Uint8Array,
    chunkIndex: number
  ): Uint8Array {
    const chunkNonce = new Uint8Array(baseNonce);
    // XOR chunk index into nonce for uniqueness
    const indexBytes = new Uint8Array(4);
    new DataView(indexBytes.buffer).setUint32(0, chunkIndex, true);

    for (let i = 0; i < 4; i++) {
      chunkNonce[i] ^= indexBytes[i];
    }

    return chunkNonce;
  }

  /**
   * Encrypt keys for multiple recipients in parallel
   */
  private async encryptKeysForRecipients(
    symmetricKey: Uint8Array,
    recipientUserIds: string[],
    getPublicKey: (userId: string) => Promise<string | null>,
    privateKey: string
  ): Promise<Array<{ userId: string; encryptedKey: string; nonce: string }>> {
    const encryptionPromises = recipientUserIds.map(async (userId) => {
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
    });

    const results = await Promise.all(encryptionPromises);
    return results.filter(Boolean) as Array<{
      userId: string;
      encryptedKey: string;
      nonce: string;
    }>;
  }

  /**
   * Save metadata and keys in parallel
   */
  private async saveMetadataAndKeys(
    metadata: EncryptedFileMetadata,
    authorUserId: string
  ): Promise<void> {
    // Inserto la metadata y espero
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
      // si falla, elimino el objeto en storage y tiro error
      await supabase.storage
        .from("encrypted_media")
        .remove([`encrypted_files/${metadata.fileId}`]);
      throw new Error(`Error guardando metadata: ${metaError.message}`);
    }

    // Inserto todas las claves en un solo batch
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

  /**
   * Analyze files to get their sizes and metadata
   */
  private async analyzeFiles(
    files: Array<{ uri: string; fileName: string; mimeType: string }>
  ) {
    return Promise.all(
      files.map(async (file) => {
        const info = await FileSystem.getInfoAsync(file.uri);
        return {
          ...file,
          size: info.exists && "size" in info ? info.size : 0,
        };
      })
    );
  }

  /**
   * Group files by size categories and type
   */
  private groupFilesBySizeAndType(
    files: Array<{
      uri: string;
      fileName: string;
      mimeType: string;
      size: number;
    }>
  ) {
    const SMALL_THRESHOLD = 500 * 1024; // 500KB
    const MEDIUM_THRESHOLD = 5 * 1024 * 1024; // 5MB

    const smallPhotos: typeof files = [];
    const smallVideos: typeof files = [];
    const mediumFiles: typeof files = [];
    const largeFiles: typeof files = [];

    files.forEach((file) => {
      const isVideo = file.mimeType.includes("video");
      const isPhoto = file.mimeType.includes("image");

      if (file.size < SMALL_THRESHOLD) {
        if (isPhoto) {
          smallPhotos.push(file);
        } else if (isVideo) {
          smallVideos.push(file);
        } else {
          mediumFiles.push(file); // Other small files
        }
      } else if (file.size < MEDIUM_THRESHOLD) {
        mediumFiles.push(file);
      } else {
        largeFiles.push(file);
      }
    });

    return { smallPhotos, smallVideos, mediumFiles, largeFiles };
  }

  /**
   * Process files in parallel with concurrency limit
   */
  private async processFilesInParallel(
    files: Array<{
      uri: string;
      fileName: string;
      mimeType: string;
      size: number;
    }>,
    concurrentLimit: number,
    authorUserId: string,
    recipientUserIds: string[],
    getPublicKey: (userId: string) => Promise<string | null>,
    getPrivateKey: () => string,
    onProgress?: (progress: number, fileName: string) => void
  ): Promise<EncryptedFileMetadata[]> {
    const results: EncryptedFileMetadata[] = [];

    for (let i = 0; i < files.length; i += concurrentLimit) {
      const batch = files.slice(i, i + concurrentLimit);

      const batchPromises = batch.map((file) =>
        this.encryptAndUploadFile(
          file.uri,
          file.fileName,
          file.mimeType,
          authorUserId,
          recipientUserIds,
          getPublicKey,
          getPrivateKey
        ).then((result) => {
          onProgress?.(1, file.fileName);
          return result;
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Create and encrypt an archive of multiple small files
   */
  private async createAndEncryptArchive(
    files: Array<{
      uri: string;
      fileName: string;
      mimeType: string;
      size: number;
    }>,
    authorUserId: string,
    recipientUserIds: string[],
    getPublicKey: (userId: string) => Promise<string | null>,
    getPrivateKey: () => string
  ): Promise<EncryptedFileMetadata> {
    // Create a JSON manifest with file metadata
    const manifest = {
      version: "1.0",
      files: files.map((f) => ({
        name: f.fileName,
        mimeType: f.mimeType,
        size: f.size,
      })),
      created: new Date().toISOString(),
    };

    // Read all files and combine into single buffer
    const fileBuffers: Array<{ metadata: any; data: Uint8Array }> = [];

    for (const file of files) {
      const data = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const buffer = await workerManager.base64ToBuffer(data);

      fileBuffers.push({
        metadata: {
          name: file.fileName,
          mimeType: file.mimeType,
          size: buffer.length,
        },
        data: buffer,
      });
    }

    // Create archive structure
    const archiveData = this.createArchiveBuffer(manifest, fileBuffers);

    // Encrypt the entire archive
    const symmetricKey = await this.cryptoService.generateSymmetricKey();
    const { encrypted, nonce } = await this.cryptoService.encryptFile(
      archiveData,
      symmetricKey
    );

    // Upload encrypted archive
    const archiveId = `archive_${Date.now()}_${authorUserId}`;
    const filePath = `encrypted_files/${archiveId}`;

    const encryptedBase64 = await workerManager.bufferToBase64(encrypted);
    const uploadBuffer = Buffer.from(encryptedBase64, "base64").buffer;

    const { error: uploadError } = await supabase.storage
      .from("encrypted_media")
      .upload(filePath, uploadBuffer, {
        contentType: "application/octet-stream",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Archive upload failed: ${uploadError.message}`);
    }

    // Encrypt keys for recipients
    const encryptedKeys = await this.encryptKeysForRecipients(
      symmetricKey,
      recipientUserIds,
      getPublicKey,
      getPrivateKey()
    );

    // Create metadata
    const metadata: EncryptedFileMetadata = {
      fileId: archiveId,
      originalName: `batch_archive_${files.length}_files.mba`,
      mimeType: "application/x-magicbook-archive",
      size: archiveData.length,
      encryptedKeys,
      fileNonce: await workerManager.bufferToBase64(nonce),
    };

    // Save metadata
    await this.saveMetadataAndKeys(metadata, authorUserId);

    return metadata;
  }

  /**
   * Create archive buffer from files
   */
  private createArchiveBuffer(
    manifest: any,
    fileBuffers: Array<{ metadata: any; data: Uint8Array }>
  ): Uint8Array {
    // Simple archive format: [manifest_length][manifest_json][file1][file2]...
    const manifestJson = JSON.stringify(manifest);
    const manifestBuffer = new TextEncoder().encode(manifestJson);

    // Calculate total size
    let totalSize = 4 + manifestBuffer.length; // 4 bytes for manifest length
    fileBuffers.forEach((f) => {
      totalSize += 4 + f.data.length; // 4 bytes for file length + file data
    });

    // Create archive buffer
    const archive = new Uint8Array(totalSize);
    let offset = 0;

    // Write manifest length
    new DataView(archive.buffer).setUint32(offset, manifestBuffer.length, true);
    offset += 4;

    // Write manifest
    archive.set(manifestBuffer, offset);
    offset += manifestBuffer.length;

    // Write files
    for (const file of fileBuffers) {
      // Write file length
      new DataView(archive.buffer).setUint32(offset, file.data.length, true);
      offset += 4;

      // Write file data
      archive.set(file.data, offset);
      offset += file.data.length;
    }

    return archive;
  }

  /**
   * Descifra un buffer muy grande por chunks, usando el mismo CHUNK_SIZE
   * que usaste para cifrar.
   */
  private async decryptLargeFile(
    encrypted: Uint8Array,
    nonce: Uint8Array,
    key: Uint8Array,
    onProgress?: (p: number) => void
  ): Promise<Uint8Array> {
    const CHUNK_PLAINTEXT = this.CHUNK_SIZE;
    const overhead = FileEncryptionService.SECRETBOX_OVERHEAD;
    const CHUNK_CIPHER = CHUNK_PLAINTEXT + overhead;
    const totalChunks = Math.ceil(encrypted.length / CHUNK_CIPHER);
    const decryptedChunks = new Array<Uint8Array>(totalChunks);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_CIPHER;
      const end = Math.min(start + CHUNK_CIPHER, encrypted.length);
      const slice = encrypted.subarray(start, end);

      // decryptFile devuelve directamente Uint8Array
      const plain = await this.cryptoService.decryptFile(slice, nonce, key);
      decryptedChunks[i] = plain;

      onProgress?.((i + 1) / totalChunks);
    }

    // concatenar todos los trozos
    const totalLen = decryptedChunks.reduce((sum, c) => sum + c.length, 0);
    const out = new Uint8Array(totalLen);
    let pos = 0;
    for (const chunk of decryptedChunks) {
      out.set(chunk, pos);
      pos += chunk.length;
    }
    return out;
  }

  /**
   * Descarga + detecta si hay que usar decryptFile o decryptLargeFile
   */
  async downloadAndDecryptFile(
    fileId: string,
    userId: string,
    getPublicKey: (userId: string) => Promise<string | null>,
    getPrivateKey: () => string
  ): Promise<{ data: Uint8Array; fileName: string; mimeType: string }> {
    // 1) metadata + key
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

    // 2) derive symmetricKey
    const authorPub = await getPublicKey(metaData.author_id);
    if (!authorPub) throw new Error("No pude obtener la clave del autor");
    const symmKey = await this.cryptoService.decryptSymmetricKey(
      { ciphertext: keyRow.encrypted_key, nonce: keyRow.nonce },
      authorPub,
      getPrivateKey()
    );

    // 3) descargar blob
    const { data: blob, error: dErr } = await supabase.storage
      .from("encrypted_media")
      .download(`encrypted_files/${fileId}`);
    if (dErr || !blob) throw new Error(`Error descarga: ${dErr?.message}`);

    // 4) a Uint8Array
    const encryptedBuffer = await this.blobToUint8Array(blob);

    // 5) el nonce
    const fileNonce = await workerManager.base64ToBuffer(metaData.file_nonce);

    // 6) elegir ruta de descifrado
    let decrypted: Uint8Array;
    const threshold =
      this.CHUNK_SIZE + FileEncryptionService.SECRETBOX_OVERHEAD;

    if (encryptedBuffer.length > threshold) {
      // usa el método por chunks
      decrypted = await this.decryptLargeFile(
        encryptedBuffer,
        fileNonce,
        symmKey,
        (p) => console.log(`🔓 Decrypt progress: ${(p * 100).toFixed(0)}%`)
      );
    } else {
      // pequeño, todo de golpe
      decrypted = await this.cryptoService.decryptFile(
        encryptedBuffer,
        fileNonce,
        symmKey
      );
    }

    return {
      data: decrypted,
      fileName: metaData.original_name,
      mimeType: metaData.mime_type,
    };
  }

  /**
   * Optimized blob to Uint8Array conversion
   */
  private async blobToUint8Array(
    blob: Blob | ArrayBuffer | Uint8Array
  ): Promise<Uint8Array> {
    if (blob instanceof Uint8Array) {
      return blob;
    }

    if (blob instanceof ArrayBuffer) {
      return new Uint8Array(blob);
    }

    // Handle Blob
    if ("arrayBuffer" in blob && typeof blob.arrayBuffer === "function") {
      return new Uint8Array(await blob.arrayBuffer());
    }

    // Fallback for React Native
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(new Uint8Array(reader.result));
        } else {
          reject(new Error("Failed to read blob"));
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob as Blob);
    });
  }

  /**
   * Batch encrypt multiple files with optimizations
   * @deprecated Use batchEncryptAndUploadFilesOptimized instead
   */
  async batchEncryptAndUploadFiles(
    files: Array<{ uri: string; fileName: string; mimeType: string }>,
    authorUserId: string,
    recipientUserIds: string[],
    getPublicKey: (userId: string) => Promise<string | null>,
    getPrivateKey: () => string,
    onProgress?: (progress: number, fileName: string) => void
  ): Promise<EncryptedFileMetadata[]> {
    // Redirect to optimized version
    return this.batchEncryptAndUploadFilesOptimized(
      files,
      authorUserId,
      recipientUserIds,
      getPublicKey,
      getPrivateKey,
      onProgress
    );
  }

  /**
   * Generate nonce helper
   */
  private async generateNonce(): Promise<Uint8Array> {
    return this.cryptoService.generateNonce();
  }
}
