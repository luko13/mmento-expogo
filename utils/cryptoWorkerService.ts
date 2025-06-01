// utils/cryptoWorkerService.ts
import { performanceOptimizer } from './performanceOptimizer';
import nacl from 'tweetnacl';
import { Buffer } from 'buffer';

/**
 * Servicio de cifrado optimizado sin workers
 * (Expo no soporta react-native-threads en managed workflow)
 */
export class CryptoWorkerService {
  private static instance: CryptoWorkerService;
  
  // Configuración de chunking
  private readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  private readonly BATCH_SIZE = 3; // Procesar 3 chunks a la vez
  
  private constructor() {}
  
  static getInstance(): CryptoWorkerService {
    if (!CryptoWorkerService.instance) {
      CryptoWorkerService.instance = new CryptoWorkerService();
    }
    return CryptoWorkerService.instance;
  }
  
  /**
   * Cifrar datos grandes con chunking optimizado
   */
  async encryptLargeData(
    data: Uint8Array,
    key: Uint8Array,
    onProgress?: (progress: number) => void
  ): Promise<{ encrypted: Uint8Array; nonces: Uint8Array[] }> {
    const chunks: Uint8Array[] = [];
    const nonces: Uint8Array[] = [];
    const encryptedChunks: Uint8Array[] = [];
    
    // Dividir en chunks
    for (let i = 0; i < data.length; i += this.CHUNK_SIZE) {
      chunks.push(data.slice(i, Math.min(i + this.CHUNK_SIZE, data.length)));
    }
    
    console.log(`📦 Procesando ${(data.length / 1024 / 1024).toFixed(2)}MB en ${chunks.length} chunks`);
    
    // Procesar en batches para no bloquear UI
    for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
      const batch = chunks.slice(i, Math.min(i + this.BATCH_SIZE, chunks.length));
      
      // Usar setTimeout para liberar el event loop
      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          // Procesar batch
          for (const chunk of batch) {
            const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
            nonces.push(nonce);
            
            const encrypted = nacl.secretbox(chunk, nonce, key);
            if (!encrypted) throw new Error('Encryption failed');
            
            encryptedChunks.push(encrypted);
          }
          
          resolve();
        }, 0);
      });
      
      // Reportar progreso
      if (onProgress) {
        const progress = Math.min(100, ((i + batch.length) / chunks.length) * 100);
        onProgress(progress);
      }
    }
    
    // Combinar chunks
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
   * Versión optimizada con requestIdleCallback (si está disponible)
   */
  async encryptWithIdleCallback(
    data: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array
  ): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      // Si requestIdleCallback está disponible, úsalo
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          try {
            const encrypted = nacl.secretbox(data, nonce, key);
            if (!encrypted) throw new Error('Encryption failed');
            resolve(encrypted);
          } catch (error) {
            reject(error);
          }
        }, { timeout: 1000 });
      } else {
        // Fallback con setTimeout
        setTimeout(() => {
          try {
            const encrypted = nacl.secretbox(data, nonce, key);
            if (!encrypted) throw new Error('Encryption failed');
            resolve(encrypted);
          } catch (error) {
            reject(error);
          }
        }, 0);
      }
    });
  }
  
  /**
   * Obtener estadísticas
   */
  getStats() {
    return {
      isReady: true,
      implementation: 'chunked-async',
      chunkSize: this.CHUNK_SIZE,
      batchSize: this.BATCH_SIZE
    };
  }
}

export const cryptoWorkerService = CryptoWorkerService.getInstance();