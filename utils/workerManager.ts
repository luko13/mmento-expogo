// utils/workerManager.ts
import { Buffer } from 'buffer';

interface WorkerMessage {
  id: number;
  type: string;
  data: any;
}

interface WorkerResponse {
  id: number;
  success: boolean;
  result?: any;
  error?: string;
}

class WorkerManager {
  private worker: Worker | null = null;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();
  private requestId = 0;
  private isAvailable = false;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      // En React Native, necesitamos usar un enfoque diferente
      if (typeof Worker !== 'undefined') {
        this.worker = new Worker(new URL('./crypto.worker.js', import.meta.url));
        this.worker.onmessage = this.handleMessage.bind(this);
        this.worker.onerror = this.handleError.bind(this);
        this.isAvailable = true;
      } else {
        console.warn('Workers no disponibles, usando fallback');
        this.isAvailable = false;
      }
    } catch (error) {
      console.error('Error inicializando worker:', error);
      this.isAvailable = false;
    }
  }

  private handleMessage(event: MessageEvent<WorkerResponse>) {
    const { id, success, result, error } = event.data;
    const pending = this.pendingRequests.get(id);
    
    if (pending) {
      if (success) {
        pending.resolve(result);
      } else {
        pending.reject(new Error(error || 'Worker error'));
      }
      this.pendingRequests.delete(id);
    }
  }

  private handleError(error: ErrorEvent) {
    console.error('Worker error:', error);
    // Rechazar todas las promesas pendientes
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('Worker crashed'));
    });
    this.pendingRequests.clear();
    
    // Reintentar inicialización
    setTimeout(() => this.initWorker(), 1000);
  }

  private async sendMessage(type: string, data: any): Promise<any> {
    if (!this.isAvailable || !this.worker) {
      // Fallback si no hay workers
      return this.fallbackOperation(type, data);
    }

    const id = ++this.requestId;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      // Timeout para evitar bloqueos
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Worker timeout'));
        }
      }, 30000); // 30 segundos

      this.worker!.postMessage({ id, type, data });
      
      // Limpiar timeout cuando se resuelva
      this.pendingRequests.get(id)!.resolve = (value) => {
        clearTimeout(timeout);
        resolve(value);
      };
    });
  }

  // Operaciones públicas
  async base64ToBuffer(base64: string): Promise<Uint8Array> {
    try {
      if (this.isAvailable) {
        const arrayBuffer = await this.sendMessage('base64ToBuffer', base64);
        return new Uint8Array(arrayBuffer);
      }
      return this.fallbackBase64ToBuffer(base64);
    } catch (error) {
      console.warn('Worker falló, usando fallback:', error);
      return this.fallbackBase64ToBuffer(base64);
    }
  }

  async bufferToBase64(buffer: Uint8Array): Promise<string> {
    try {
      if (this.isAvailable) {
        return await this.sendMessage('bufferToBase64', buffer);
      }
      return this.fallbackBufferToBase64(buffer);
    } catch (error) {
      console.warn('Worker falló, usando fallback:', error);
      return this.fallbackBufferToBase64(buffer);
    }
  }

  async encryptBatch(chunks: Uint8Array[], key: Uint8Array): Promise<Uint8Array[]> {
    try {
      if (this.isAvailable) {
        return await this.sendMessage('encryptBatch', { chunks, key });
      }
      // Fallback: procesar secuencialmente
      return Promise.all(chunks.map(chunk => this.encryptChunk(chunk, key)));
    } catch (error) {
      console.warn('Worker falló para batch, procesando secuencialmente');
      return Promise.all(chunks.map(chunk => this.encryptChunk(chunk, key)));
    }
  }

  // Métodos fallback para cuando no hay workers
  private fallbackBase64ToBuffer(base64: string): Uint8Array {
    return Uint8Array.from(Buffer.from(base64, 'base64'));
  }

  private fallbackBufferToBase64(buffer: Uint8Array): string {
    return Buffer.from(buffer).toString('base64');
  }

  private async fallbackOperation(type: string, data: any): Promise<any> {
    switch(type) {
      case 'base64ToBuffer':
        return this.fallbackBase64ToBuffer(data);
      case 'bufferToBase64':
        return this.fallbackBufferToBase64(data);
      default:
        throw new Error(`Operación no soportada en fallback: ${type}`);
    }
  }

  private async encryptChunk(chunk: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    // Implementación temporal
    return chunk;
  }

  // Limpieza
  dispose() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

// Singleton
export const workerManager = new WorkerManager();