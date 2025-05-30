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
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();
  private requestId = 0;

  // Operaciones públicas - implementación directa sin Workers
  async base64ToBuffer(base64: string): Promise<Uint8Array> {
    try {
      return Uint8Array.from(Buffer.from(base64, 'base64'));
    } catch (error) {
      console.error('Error converting base64 to buffer:', error);
      throw error;
    }
  }

  async bufferToBase64(buffer: Uint8Array): Promise<string> {
    try {
      return Buffer.from(buffer).toString('base64');
    } catch (error) {
      console.error('Error converting buffer to base64:', error);
      throw error;
    }
  }

  async encryptBatch(chunks: Uint8Array[], key: Uint8Array): Promise<Uint8Array[]> {
    // Procesar secuencialmente ya que no hay workers
    return Promise.all(chunks.map(chunk => this.encryptChunk(chunk, key)));
  }

  async batchBase64ToBuffer(base64Array: string[]): Promise<Uint8Array[]> {
    return Promise.all(base64Array.map(b64 => this.base64ToBuffer(b64)));
  }

  async streamEncrypt(chunks: Uint8Array[], key: Uint8Array, nonces: Uint8Array[]): Promise<Uint8Array[]> {
    return Promise.all(
      chunks.map((chunk, i) => this.encryptChunk(chunk, key, nonces[i]))
    );
  }

  private async encryptChunk(chunk: Uint8Array, key: Uint8Array, nonce?: Uint8Array): Promise<Uint8Array> {
    // Implementación temporal - se reemplazará con hybridCrypto
    // Por ahora retorna el chunk sin modificar
    return chunk;
  }

  // Limpieza
  dispose() {
    this.pendingRequests.clear();
  }
}

// Singleton
export const workerManager = new WorkerManager();