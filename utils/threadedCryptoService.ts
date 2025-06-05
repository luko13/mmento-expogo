// utils/threadedCryptoService.ts
import { Thread } from 'react-native-threads';
import { Buffer } from 'buffer';
import { performanceOptimizer } from './performanceOptimizer';
import nacl from 'tweetnacl';

interface WorkerTask {
  id: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  startTime: number;
}

export class ThreadedCryptoService {
  private static instance: ThreadedCryptoService;
  private worker: Thread | null = null;
  private taskQueue = new Map<number, WorkerTask>();
  private taskId = 0;
  private isReady = false;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  
  // Configuración de chunking adaptativo
  private readonly MIN_CHUNK_SIZE = 256 * 1024; // 256KB
  private readonly MAX_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
  private readonly WORKER_TIMEOUT = 30000; // 30s
  
  private constructor() {
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
    this.initializeWorker();
  }
  
  static getInstance(): ThreadedCryptoService {
    if (!ThreadedCryptoService.instance) {
      ThreadedCryptoService.instance = new ThreadedCryptoService();
    }
    return ThreadedCryptoService.instance;
  }
  
  private async initializeWorker() {
    try {
      // Crear el worker thread
      this.worker = new Thread('./crypto.worker.thread.js');
      
      // Escuchar mensajes del worker
      this.worker.onmessage = (message: string) => {
        this.handleWorkerMessage(message);
      };
      
      // Manejar errores del worker
      this.worker.onerror = (error: any) => {
        console.error('Error en worker:', error);
        // Rechazar todas las tareas pendientes
        for (const task of this.taskQueue.values()) {
          task.reject(new Error('Worker crashed'));
        }
        this.taskQueue.clear();
        
        // Reiniciar worker
        this.restartWorker();
      };
      
          } catch (error) {
      console.error('Error inicializando worker:', error);
      // Marcar como listo aunque falle para no bloquear
      this.isReady = true;
      this.readyResolve();
    }
  }
  
  private handleWorkerMessage(message: string) {
    try {
      const response = JSON.parse(message);
      
      // Verificar si es mensaje de ready
      if (response.type === 'ready') {
        this.isReady = true;
        this.readyResolve();
                return;
      }
      
      // Procesar respuesta de tarea
      const task = this.taskQueue.get(response.id);
      if (!task) return;
      
      this.taskQueue.delete(response.id);
      
      const duration = Date.now() - task.startTime;
      
      if (response.success) {
                task.resolve(response.result);
      } else {
        console.error(`❌ Tarea ${response.id} falló:`, response.error);
        task.reject(new Error(response.error));
      }
    } catch (error) {
      console.error('Error procesando mensaje del worker:', error);
    }
  }
  
  private async restartWorker() {
        
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch (e) {
        console.error('Error terminando worker:', e);
      }
    }
    
    this.isReady = false;
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
    
    await this.initializeWorker();
  }
  
  private async sendToWorker(type: string, data: any): Promise<any> {
    // Esperar a que el worker esté listo
    await this.readyPromise;
    
    if (!this.worker) {
      throw new Error('Worker no disponible');
    }
    
    const id = ++this.taskId;
    
    return new Promise((resolve, reject) => {
      // Timeout para evitar bloqueos
      const timeout = setTimeout(() => {
        this.taskQueue.delete(id);
        reject(new Error(`Worker timeout para tarea ${id}`));
      }, this.WORKER_TIMEOUT);
      
      // Registrar tarea
      this.taskQueue.set(id, {
        id,
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        startTime: Date.now()
      });
      
      // Enviar mensaje al worker
      this.worker!.postMessage(JSON.stringify({ id, type, data }));
    });
  }
  
  /**
   * Cifrar datos usando worker thread
   */
  async encryptWithWorker(
    data: Uint8Array, 
    key: Uint8Array, 
    nonce: Uint8Array
  ): Promise<Uint8Array> {
    try {
      // Si el archivo es pequeño, no usar worker
      if (data.length < this.MIN_CHUNK_SIZE) {
        return this.encryptLocal(data, key, nonce);
      }
      
      // Convertir a base64 para transferencia
      const chunkB64 = Buffer.from(data).toString('base64');
      const keyB64 = Buffer.from(key).toString('base64');
      const nonceB64 = Buffer.from(nonce).toString('base64');
      
      // Medir rendimiento
      const result = await performanceOptimizer.measureAndOptimize(
        'worker-encrypt',
        async () => {
          const encryptedB64 = await this.sendToWorker('encrypt', {
            chunk: chunkB64,
            key: keyB64,
            nonce: nonceB64
          });
          
          return new Uint8Array(Buffer.from(encryptedB64, 'base64'));
        }
      );
      
      return result;
    } catch (error) {
      console.error('Error en cifrado con worker:', error);
      // Fallback a cifrado local
      return this.encryptLocal(data, key, nonce);
    }
  }
  
  /**
   * Cifrar múltiples chunks en paralelo
   */
  async encryptChunksWithWorker(
    data: Uint8Array,
    key: Uint8Array,
    onProgress?: (progress: number) => void
  ): Promise<{ encrypted: Uint8Array; nonces: Uint8Array[] }> {
    const chunkSize = this.calculateOptimalChunkSize(data.length);
    const chunks: Uint8Array[] = [];
    const nonces: Uint8Array[] = [];
    
    // Dividir en chunks
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, Math.min(i + chunkSize, data.length)));
    }
    
        
    // Generar nonces
    for (let i = 0; i < chunks.length; i++) {
      const nonceB64 = await this.sendToWorker('generateNonce', {});
      nonces.push(new Uint8Array(Buffer.from(nonceB64, 'base64')));
    }
    
    // Cifrar chunks en paralelo (máximo 3 workers simultáneos)
    const PARALLEL_LIMIT = 3;
    const encryptedChunks: Uint8Array[] = new Array(chunks.length);
    
    for (let i = 0; i < chunks.length; i += PARALLEL_LIMIT) {
      const batch = chunks.slice(i, Math.min(i + PARALLEL_LIMIT, chunks.length));
      const batchNonces = nonces.slice(i, Math.min(i + PARALLEL_LIMIT, chunks.length));
      
      const promises = batch.map((chunk, idx) => 
        this.encryptWithWorker(chunk, key, batchNonces[idx])
      );
      
      const results = await Promise.all(promises);
      
      // Guardar resultados en orden
      results.forEach((result, idx) => {
        encryptedChunks[i + idx] = result;
      });
      
      // Reportar progreso
      if (onProgress) {
        const progress = Math.min(100, ((i + batch.length) / chunks.length) * 100);
        onProgress(progress);
      }
    }
    
    // Combinar chunks cifrados
    const totalLength = encryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const encrypted = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of encryptedChunks) {
      encrypted.set(chunk, offset);
      offset += chunk.length;
    }
    
    return { encrypted, nonces };
  }
  
  /**
   * Calcular tamaño óptimo de chunk basado en rendimiento
   */
  private calculateOptimalChunkSize(totalSize: number): number {
    const metrics = performanceOptimizer.getAverageMetrics('worker-encrypt');
    
    // Si tenemos métricas, ajustar basado en velocidad
    if (metrics.count > 0 && metrics.avgSpeed > 0) {
      // Objetivo: cada chunk debe tardar ~100-200ms
      const targetTime = 150; // ms
      const optimalSize = (metrics.avgSpeed * targetTime * 1024); // bytes
      
      return Math.min(
        this.MAX_CHUNK_SIZE,
        Math.max(this.MIN_CHUNK_SIZE, Math.floor(optimalSize))
      );
    }
    
    // Por defecto, usar 512KB para archivos < 10MB, 1MB para más grandes
    return totalSize < 10 * 1024 * 1024 ? 512 * 1024 : 1024 * 1024;
  }
  
  /**
   * Cifrado local como fallback (sin worker)
   */
  private async encryptLocal(
    data: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array
  ): Promise<Uint8Array> {
    // Importar nacl localmente
    const nacl = await import('tweetnacl');
    const encrypted = nacl.secretbox(data, nonce, key);
    
    if (!encrypted) {
      throw new Error('Cifrado local falló');
    }
    
    return encrypted;
  }
  
  /**
   * Limpiar recursos
   */
  async dispose() {
    if (this.worker) {
      try {
        // Cancelar tareas pendientes
        for (const task of this.taskQueue.values()) {
          task.reject(new Error('Service disposed'));
        }
        this.taskQueue.clear();
        
        // Terminar worker
        this.worker.terminate();
        this.worker = null;
      } catch (error) {
        console.error('Error al limpiar worker:', error);
      }
    }
  }
  
  /**
   * Obtener estadísticas del servicio
   */
  getStats() {
    return {
      isReady: this.isReady,
      pendingTasks: this.taskQueue.size,
      workerActive: this.worker !== null
    };
  }
}

// Exportar instancia singleton
export const threadedCrypto = ThreadedCryptoService.getInstance();