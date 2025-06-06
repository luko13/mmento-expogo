// utils/backgroundEncryption.ts
import { v4 as uuidv4 } from "uuid";
import * as FileSystem from "expo-file-system";
import { Buffer } from "buffer";
import { supabase } from "../lib/supabase";
import { CryptoService } from "./cryptoService";
import { hybridCrypto } from "./hybridCrypto";
import { performanceOptimizer } from "./performanceOptimizer";
import { compressionService } from "./compressionService";

interface EncryptionTask {
  id: string;
  uri: string;
  fileName: string;
  type: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  promise: Promise<string>;
  cancel?: () => void;
  result?: string;
  error?: Error;
  startTime?: number;
  endTime?: number;
}

interface EncryptionParams {
  uri: string;
  type: string;
  fileName: string;
  userId: string;
  onProgress: (progress: number) => void;
}

interface ProcessedFile {
  data: Uint8Array;
  wasCompressed: boolean;
  compressionRatio?: number;
  originalSize: number;
}

export class BackgroundEncryptionService {
  private encryptionTasks = new Map<string, EncryptionTask>();
  private fileCache = new Map<string, Uint8Array>();
  private cryptoService = CryptoService.getInstance();
  private maxConcurrentTasks = 3;
  private activeTasksCount = 0;
  private taskQueue: string[] = [];
  private progressThrottle = new Map<string, number>();
  private readonly PROGRESS_UPDATE_INTERVAL = 500; // ms

  // Configuración optimizada
  private readonly CHUNK_SIZE = 512 * 1024; // 512KB chunks para mejor rendimiento en móvil
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB cache
  private currentCacheSize = 0;

  constructor() {
    // Inicializar crypto al crear el servicio
    this.initializeCrypto();
  }

  private async initializeCrypto() {
    await hybridCrypto.initialize();
    console.log("🔐 BackgroundEncryption: Crypto initialized");
  }

  /**
   * Inicia el cifrado de un archivo en background
   */
  async startEncryption(params: EncryptionParams): Promise<string> {
    const taskId = uuidv4();
    let cancelled = false;

    const task: EncryptionTask = {
      id: taskId,
      uri: params.uri,
      fileName: params.fileName,
      type: params.type,
      status: "pending",
      progress: 0,
      promise: this.createEncryptionPromise(taskId, params, () => cancelled),
      cancel: () => {
        cancelled = true;
        this.cancelTask(taskId);
      },
    };

    this.encryptionTasks.set(taskId, task);

    // Agregar a la cola y procesar
    this.taskQueue.push(taskId);
    this.processNextInQueue();

    return taskId;
  }

  /**
   * Obtener tarea por ID
   */
  getTask(taskId: string): EncryptionTask | undefined {
    return this.encryptionTasks.get(taskId);
  }

  /**
   * Crea la promesa de cifrado con manejo de cancelación
   */
  private createEncryptionPromise(
    taskId: string,
    params: EncryptionParams,
    isCancelled: () => boolean
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        // Esperar turno en la cola
        await this.waitForTurn(taskId);

        if (isCancelled()) {
          reject(new Error("Task cancelled"));
          return;
        }

        // Procesar archivo
        const result = await this.processFile(params, isCancelled);

        // Actualizar estado
        const task = this.encryptionTasks.get(taskId);
        if (task) {
          task.status = "completed";
          task.result = result;
          task.endTime = Date.now();
          task.progress = 100;
        }

        resolve(result);
      } catch (error) {
        // Manejar error
        const task = this.encryptionTasks.get(taskId);
        if (task) {
          task.status = "failed";
          task.error = error as Error;
          task.endTime = Date.now();
        }

        reject(error);
      } finally {
        this.activeTasksCount--;
        this.processNextInQueue();
      }
    });
  }

  /**
   * Espera el turno en la cola de procesamiento
   */
  private async waitForTurn(taskId: string): Promise<void> {
    return new Promise((resolve) => {
      const checkTurn = () => {
        const index = this.taskQueue.indexOf(taskId);
        if (index === -1) {
          // Ya fue procesado o cancelado
          resolve();
          return;
        }

        if (
          index < this.maxConcurrentTasks &&
          this.activeTasksCount < this.maxConcurrentTasks
        ) {
          // Es su turno
          this.taskQueue.splice(index, 1);
          this.activeTasksCount++;

          const task = this.encryptionTasks.get(taskId);
          if (task) {
            task.status = "processing";
            task.startTime = Date.now();
          }

          resolve();
        } else {
          // Esperar y revisar de nuevo
          setTimeout(checkTurn, 100);
        }
      };

      checkTurn();
    });
  }

  /**
   * Procesa el siguiente archivo en la cola
   */
  private processNextInQueue() {
    if (
      this.taskQueue.length === 0 ||
      this.activeTasksCount >= this.maxConcurrentTasks
    ) {
      return;
    }

    // Disparar el procesamiento del siguiente
    const nextTaskId = this.taskQueue[0];
    if (nextTaskId) {
      const task = this.encryptionTasks.get(nextTaskId);
      if (task && task.status === "pending") {
        // El waitForTurn se encargará del resto
      }
    }
  }

  /**
   * Proceso principal de cifrado optimizado
   */
  private async processFile(
    params: EncryptionParams,
    isCancelled: () => boolean
  ): Promise<string> {
    const taskId = params.fileName;
    const startTime = Date.now();
    console.log(`📋 Procesando ${params.fileName}...`);

    // Función throttled para progreso
    const reportProgress = (progress: number) => {
      const now = Date.now();
      const lastUpdate = this.progressThrottle.get(taskId) || 0;

      if (
        now - lastUpdate >= this.PROGRESS_UPDATE_INTERVAL ||
        progress === 100
      ) {
        this.progressThrottle.set(taskId, now);
        params.onProgress(progress);
      }
    };

    try {
      // Verificar cancelación al inicio
      if (isCancelled()) {
        console.log(`🚫 Tarea ${taskId} cancelada antes de empezar`);
        throw new Error("Cancelled");
      }

      // 1. Verificar caché
      const cacheKey = await this.getFileHash(params.uri);
      const cachedResult = this.fileCache.get(cacheKey);
      if (cachedResult) {
        console.log("✅ Archivo encontrado en caché");
        reportProgress(100);
        return cacheKey;
      }

      // 2. Leer archivo optimizado
      if (isCancelled()) throw new Error("Cancelled");
      const fileData = await this.readFileOptimized(params.uri);
      reportProgress(20);

      // 3. Comprimir inteligentemente
      if (isCancelled()) throw new Error("Cancelled");
      const processed = await this.smartCompress(fileData, params.type);
      reportProgress(40);

      // 4. Cifrar con streaming
      if (isCancelled()) throw new Error("Cancelled");
      console.log("🔐 ANTES de cifrar - data.length:", processed.data.length);

      const encrypted = await this.encryptWithStreaming(processed.data);
      console.log("CIFRADO:", {
        originalSize: processed.data.length,
        encryptedSize: encrypted.encrypted.length,
        wasCompressed: processed.wasCompressed,
        compressionRatio: processed.compressionRatio,
      });
      console.log("🔐 DESPUÉS de cifrar:");
      console.log("- encrypted.encrypted.length:", encrypted.encrypted.length);
      console.log(
        "- encrypted.encrypted.byteLength:",
        encrypted.encrypted.byteLength
      );
      console.log(
        "- Overhead NaCl:",
        encrypted.encrypted.length - processed.data.length
      );
      console.log(
        "- Primera verificación:",
        encrypted.encrypted instanceof Uint8Array
      );

      reportProgress(70);

      // 5. Generar metadatos
      const metadata = {
        fileName: params.fileName,
        originalSize: processed.originalSize,
        encryptedSize: encrypted.encrypted.length,
        wasCompressed: processed.wasCompressed,
        compressionRatio: processed.compressionRatio,
        mimeType: this.getMimeType(params.type, params.fileName),
        nonce: Buffer.from(encrypted.nonce).toString("base64"),
      };

      // 6. Subir con reintentos inteligentes
      if (isCancelled()) throw new Error("Cancelled");

      console.log("📤 ANTES de subir:");
      console.log("- Tamaño a subir:", encrypted.encrypted.length);
      console.log(
        "- Tipo:",
        Object.prototype.toString.call(encrypted.encrypted)
      );

      const fileId = await this.uploadWithSmartRetry(
        encrypted.encrypted,
        metadata,
        (progress) => reportProgress(70 + progress * 0.3)
      );

      // 7. Guardar en caché si es pequeño
      if (encrypted.encrypted.length < 5 * 1024 * 1024) {
        this.addToCache(cacheKey, encrypted.encrypted);
      }

      const duration = Date.now() - startTime;
      console.log(
        `✅ ${params.fileName} procesado en ${(duration / 1000).toFixed(2)}s`
      );

      reportProgress(100);
      return fileId; // IMPORTANTE: Retornar fileId, no cacheKey
    } catch (error: any) {
      if (error.message === "Cancelled") {
        console.log(`🚫 ${params.fileName} cancelado`);
      } else {
        console.error(`❌ Error procesando ${params.fileName}:`, error);
      }
      throw error;
    } finally {
      // Limpiar throttle
      this.progressThrottle.delete(taskId);
    }
  }

  /**
   * Lee archivo de forma optimizada usando chunks
   */
  private async readFileOptimized(uri: string): Promise<Uint8Array> {
    try {
      // Manejar data URI (base64)
      if (uri.startsWith("data:")) {
        const base64Data = uri.split(",")[1];
        if (!base64Data) {
          throw new Error("Invalid data URI format");
        }
        return this.fastBase64Decode(base64Data);
      }

      // Para archivos del sistema, intentar diferentes métodos
      if (uri.startsWith("file://") || uri.startsWith("content://")) {
        // Primero intentar con fetch (más eficiente)
        try {
          const response = await fetch(uri);
          const arrayBuffer = await response.arrayBuffer();
          return new Uint8Array(arrayBuffer);
        } catch (fetchError) {
          console.log("Fetch failed, trying FileSystem...");

          // Fallback a FileSystem
          try {
            const fileInfo = await FileSystem.getInfoAsync(uri);
            if (!fileInfo.exists) {
              throw new Error("File not found");
            }

            // Verificar si fileInfo tiene size
            const fileSize = "size" in fileInfo ? fileInfo.size : 0;

            // Si es pequeño o no sabemos el tamaño, leer de una vez
            if (fileSize === 0 || fileSize < 5 * 1024 * 1024) {
              const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              return this.fastBase64Decode(base64);
            }

            // Para archivos grandes, leer en chunks
            console.log(
              `📖 Leyendo archivo grande (${(fileSize / 1024 / 1024).toFixed(
                2
              )}MB) en chunks...`
            );

            // Nota: FileSystem.readAsStringAsync no soporta position/length en Expo
            // Así que para archivos grandes, leer todo de una vez
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            return this.fastBase64Decode(base64);
          } catch (fileSystemError) {
            console.error("FileSystem error:", fileSystemError);
            throw fileSystemError;
          }
        }
      }

      // Para otros tipos de URI, intentar fetch
      try {
        const response = await fetch(uri);
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } catch (error) {
        throw new Error(`Unable to read URI: ${uri}`);
      }
    } catch (error) {
      console.error("Error reading file:", error);
      throw new Error(
        "Failed to read file: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }

  /**
   * Decodificación Base64 optimizada
   */
  private fastBase64Decode(base64: string): Uint8Array {
    // Usar el método más rápido disponible
    if (typeof atob !== "undefined") {
      try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      } catch (e) {
        // Fallback si atob falla
      }
    }

    // Fallback a Buffer
    return Buffer.from(base64, "base64");
  }

  /**
   * Une chunks de forma eficiente
   */
  private mergeChunks(chunks: Uint8Array[]): Uint8Array {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);

    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Compresión inteligente basada en tipo y tamaño
   */
  private async smartCompress(
    data: Uint8Array,
    type: string
  ): Promise<ProcessedFile> {
    const originalSize = data.length;
    const sizeMB = originalSize / (1024 * 1024);

    console.log(
      `🗜️ Evaluando compresión para ${type} (${sizeMB.toFixed(2)}MB)...`
    );

    // No comprimir archivos muy pequeños
    if (sizeMB < 0.5) {
      return {
        data,
        wasCompressed: false,
        originalSize,
      };
    }

    // Decidir estrategia según tipo
    if (type.includes("image")) {
      // Solo comprimir imágenes grandes
      if (sizeMB > 2) {
        try {
          // Crear un data URI temporal para el servicio de compresión
          const base64String = Buffer.from(data).toString("base64");
          const dataUri = `data:${type};base64,${base64String}`;

          const compressed = await compressionService.compressFile(
            dataUri,
            "image/jpeg",
            {
              quality: sizeMB > 5 ? 0.7 : 0.8,
              maxWidth: 2048,
              maxHeight: 2048,
            }
          );

          if (compressed.wasCompressed && compressed.uri) {
            // Convertir el URI comprimido de vuelta a Uint8Array
            const base64Data = compressed.uri.split(",")[1];
            const compressedData = Buffer.from(base64Data, "base64");

            return {
              data: new Uint8Array(compressedData),
              wasCompressed: true,
              compressionRatio: compressed.ratio,
              originalSize,
            };
          }
        } catch (compressionError) {
          console.warn("Compression failed, using original:", compressionError);
        }
      }
    }

    return {
      data,
      wasCompressed: false,
      originalSize,
    };
  }

  /**
   * Cifrado con streaming para archivos grandes
   */
  private async encryptWithStreaming(data: Uint8Array): Promise<{
    encrypted: Uint8Array;
    nonce: Uint8Array;
  }> {
    // Generar clave simétrica
    const symmetricKey = await this.cryptoService.generateSymmetricKey();
    console.log("PRE-CIFRADO:", {
      inputSize: data.length,
      isLargeFile: data.length >= 5 * 1024 * 1024,
    });
    // Para archivos pequeños, cifrar directamente
    if (data.length < 5 * 1024 * 1024) {
      const result = await this.cryptoService.encryptFile(data, symmetricKey);

      // 🔴 LOG DESPUÉS DE CIFRAR
      console.log("POST-CIFRADO (pequeño):", {
        encryptedSize: result.encrypted.length,
        overhead: result.encrypted.length - data.length,
      });

      return result;
    }

    // Para archivos grandes, usar chunking
    console.log("🔒 Cifrando archivo grande con chunking...");
    const nonce = await this.cryptoService.generateNonce();
    const encryptedChunks: Uint8Array[] = [];

    for (let i = 0; i < data.length; i += this.CHUNK_SIZE) {
      const chunk = data.slice(i, Math.min(i + this.CHUNK_SIZE, data.length));
      const { encrypted } = await hybridCrypto.encrypt(
        chunk,
        symmetricKey,
        nonce
      );
      encryptedChunks.push(encrypted);

      // Liberar memoria periódicamente
      if (i % (this.CHUNK_SIZE * 10) === 0) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    return {
      encrypted: this.mergeChunks(encryptedChunks),
      nonce,
    };
  }

  /**
   * Subida con reintentos inteligentes
   */
  private async uploadWithSmartRetry(
    encryptedData: Uint8Array,
    metadata: any,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const maxRetries = 3;
    const fileId = `enc_${Date.now()}_${uuidv4().substr(0, 8)}`;
    const filePath = `encrypted_files/${fileId}`;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(
          `📤 Subiendo archivo (intento ${attempt + 1}/${maxRetries})...`
        );
        console.log("UPLOAD:", {
          dataToUpload: encryptedData.length,
          fileId: fileId,
        });
        const { data, error } = await supabase.storage
          .from("encrypted_media")
          .upload(filePath, encryptedData, {
            contentType: "application/octet-stream",
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          throw error;
        }

        onProgress?.(100);
        return fileId;
      } catch (error: any) {
        console.error(`Error en intento ${attempt + 1}:`, error);

        // Analizar tipo de error
        if (
          error.message?.includes("413") ||
          error.message?.includes("too large")
        ) {
          throw new Error("Archivo demasiado grande para subir");
        }

        if (error.message?.includes("401") || error.message?.includes("JWT")) {
          throw new Error("Sesión expirada");
        }

        if (attempt === maxRetries - 1) {
          throw error;
        }

        // Esperar antes de reintentar (backoff exponencial)
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`⏳ Esperando ${waitTime}ms antes de reintentar...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    throw new Error("Failed after all retries");
  }

  /**
   * Obtiene hash de archivo para caché
   */
  private async getFileHash(uri: string): Promise<string> {
    // Para data URIs, usar el contenido como hash
    if (uri.startsWith("data:")) {
      const hashInput = uri.substring(0, 100); // Primeros 100 chars
      let hash = 0;
      for (let i = 0; i < hashInput.length; i++) {
        const char = hashInput.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return `data_${Math.abs(hash).toString(36)}`;
    }

    // Solo intentar getInfoAsync para archivos reales del sistema
    if (uri.startsWith("file://") || uri.startsWith("content://")) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);

        let modTime = "";
        let size = "";

        if (fileInfo.exists && "modificationTime" in fileInfo) {
          modTime = String(fileInfo.modificationTime);
        }

        if (fileInfo.exists && "size" in fileInfo) {
          size = String(fileInfo.size);
        }

        const hashInput = `${uri}-${modTime}-${size}`;

        let hash = 0;
        for (let i = 0; i < hashInput.length; i++) {
          const char = hashInput.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash;
        }

        return `file_${Math.abs(hash).toString(36)}`;
      } catch (error) {
        // Si falla, usar solo el URI
        console.warn("Failed to get file info, using URI hash:", error);
      }
    }

    // Para cualquier otro tipo de URI, usar solo el URI
    const hashInput = uri;
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `uri_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Gestión de caché con límite de tamaño
   */
  private addToCache(key: string, data: Uint8Array) {
    const size = data.length;

    // Verificar si necesitamos liberar espacio
    if (this.currentCacheSize + size > this.MAX_CACHE_SIZE) {
      this.evictFromCache(size);
    }

    this.fileCache.set(key, data);
    this.currentCacheSize += size;

    console.log(
      `💾 Archivo agregado a caché (${(
        this.currentCacheSize /
        1024 /
        1024
      ).toFixed(2)}MB usado)`
    );
  }

  /**
   * Libera espacio en caché
   */
  private evictFromCache(neededSpace: number) {
    const entries = Array.from(this.fileCache.entries());
    let freedSpace = 0;

    // Eliminar archivos más antiguos primero (FIFO)
    for (const [key, data] of entries) {
      if (freedSpace >= neededSpace) break;

      freedSpace += data.length;
      this.fileCache.delete(key);
    }

    this.currentCacheSize -= freedSpace;
    console.log(
      `🗑️ Liberados ${(freedSpace / 1024 / 1024).toFixed(2)}MB de caché`
    );
  }

  /**
   * Obtiene el tipo MIME basado en la extensión
   */
  private getMimeType(type: string, fileName: string): string {
    if (type.includes("image")) return "image/jpeg";
    if (type.includes("video")) return "video/mp4";

    const extension = fileName.split(".").pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      mp4: "video/mp4",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
    };

    return mimeTypes[extension || ""] || "application/octet-stream";
  }

  /**
   * Cancela una tarea de cifrado
   */
  cancelTask(taskId: string) {
    const task = this.encryptionTasks.get(taskId);
    if ((task && task.status === "pending") || task?.status === "processing") {
      task.status = "cancelled";

      // Remover de la cola si está pendiente
      const index = this.taskQueue.indexOf(taskId);
      if (index > -1) {
        this.taskQueue.splice(index, 1);
      }

      console.log(`🚫 Tarea ${taskId} cancelada`);
    }
  }

  /**
   * Cancela todas las tareas
   */
  cancelAll() {
    for (const [taskId, task] of this.encryptionTasks) {
      if (task.status === "pending" || task.status === "processing") {
        this.cancelTask(taskId);
      }
    }

    this.taskQueue = [];
    this.activeTasksCount = 0;
    console.log("🚫 Todas las tareas canceladas");
  }

  /**
   * Espera a que todas las tareas terminen
   */
  async waitForAllEncryptions(): Promise<string[]> {
    const tasks = Array.from(this.encryptionTasks.values());
    const pendingTasks = tasks.filter(
      (t) => t.status === "pending" || t.status === "processing"
    );

    console.log(`⏳ Esperando ${pendingTasks.length} tareas de cifrado...`);

    try {
      const results = await Promise.all(pendingTasks.map((t) => t.promise));

      console.log("✅ Todas las tareas completadas");
      return results;
    } catch (error) {
      console.error("❌ Error esperando tareas:", error);
      throw error;
    }
  }

  /**
   * Espera a que tareas específicas terminen
   */
  async waitForSpecificTasks(taskIds: string[]): Promise<string[]> {
    const tasks = taskIds
      .map((id) => this.encryptionTasks.get(id))
      .filter((task) => task !== undefined) as EncryptionTask[];

    const pendingTasks = tasks.filter(
      (t) => t.status === "pending" || t.status === "processing"
    );

    if (pendingTasks.length === 0) {
      // Retornar los resultados de las tareas completadas
      return tasks
        .filter((t) => t.status === "completed" && t.result)
        .map((t) => t.result!);
    }

    console.log(`⏳ Esperando ${pendingTasks.length} tareas específicas...`);

    try {
      const results = await Promise.all(
        pendingTasks.map((t) =>
          t.promise.catch((err) => {
            console.error(`Task ${t.id} failed:`, err);
            return null;
          })
        )
      );

      // Filtrar resultados válidos
      return results.filter((r) => r !== null) as string[];
    } catch (error) {
      console.error("❌ Error esperando tareas:", error);
      return [];
    }
  }

  /**
   * Guarda referencias de tareas para uso posterior
   */
  saveTasks(tasks: Array<{ uri: string; taskId: string }>) {
    // Las tareas ya están guardadas en encryptionTasks
    console.log(`💾 ${tasks.length} tareas guardadas para procesamiento`);
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getStats() {
    const tasks = Array.from(this.encryptionTasks.values());

    return {
      totalTasks: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      processing: tasks.filter((t) => t.status === "processing").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      failed: tasks.filter((t) => t.status === "failed").length,
      cancelled: tasks.filter((t) => t.status === "cancelled").length,
      cacheSize: `${(this.currentCacheSize / 1024 / 1024).toFixed(2)}MB`,
      queueLength: this.taskQueue.length,
      activeTasksCount: this.activeTasksCount,
    };
  }

  /**
   * Limpia tareas completadas para liberar memoria
   */
  cleanup() {
    let removed = 0;

    for (const [taskId, task] of this.encryptionTasks) {
      if (
        task.status === "completed" ||
        task.status === "failed" ||
        task.status === "cancelled"
      ) {
        this.encryptionTasks.delete(taskId);
        removed++;
      }
    }

    console.log(`🧹 Limpiadas ${removed} tareas completadas`);
  }
}

// Singleton
let backgroundEncryptionServiceInstance: BackgroundEncryptionService | null =
  null;

export const backgroundEncryptionService = (() => {
  if (!backgroundEncryptionServiceInstance) {
    backgroundEncryptionServiceInstance = new BackgroundEncryptionService();
  }
  return backgroundEncryptionServiceInstance;
})();
