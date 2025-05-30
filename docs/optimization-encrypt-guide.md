Guía Definitiva de Optimización de Cifrado para React Native
1. Reemplazar conversiones Base64 por Buffer nativo + Workers
typescript// worker.js
import { Buffer } from 'buffer';

self.onmessage = async (e) => {
  const { type, data, id } = e.data;
  
  switch(type) {
    case 'base64ToBuffer':
      const buffer = Buffer.from(data, 'base64');
      self.postMessage({ id, result: buffer });
      break;
    case 'bufferToBase64':
      const base64 = Buffer.from(data).toString('base64');
      self.postMessage({ id, result: base64 });
      break;
  }
};
Uso:
typescriptconst worker = new Worker('./worker.js');
const convertBase64 = (data) => new Promise(resolve => {
  const id = Date.now();
  worker.postMessage({ type: 'base64ToBuffer', data, id });
  worker.onmessage = (e) => {
    if (e.data.id === id) resolve(e.data.result);
  };
});
2. Implementación híbrida de cifrado (WASM + Nativo)
typescriptclass HybridCrypto {
  private sodium: any;
  private nativeCrypto: any;
  
  async initialize() {
    // Intenta cargar la versión más rápida disponible
    try {
      const { NativeCrypto } = await import('react-native-fast-crypto');
      this.nativeCrypto = new NativeCrypto();
    } catch {
      // Fallback a WASM
      const sodium = await import('libsodium-wrappers-sumo');
      await sodium.ready;
      this.sodium = sodium;
    }
  }
  
  async encrypt(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    if (this.nativeCrypto) {
      return this.nativeCrypto.secretbox_easy(data, key);
    }
    const nonce = this.sodium.randombytes_buf(this.sodium.crypto_secretbox_NONCEBYTES);
    return this.sodium.crypto_secretbox_easy(data, nonce, key);
  }
}
3. Cifrado por chunks con streaming y paralelización
typescriptconst CHUNK_SIZE = 512 * 1024; // 512KB para mejor balance
const PARALLEL_CHUNKS = 3;

async function encryptFileStreaming(uri: string, key: Uint8Array) {
  const fileInfo = await FileSystem.getInfoAsync(uri);
  const totalChunks = Math.ceil(fileInfo.size / CHUNK_SIZE);
  
  const encryptedChunks = [];
  const processingQueue = [];
  
  for (let i = 0; i < totalChunks; i += PARALLEL_CHUNKS) {
    const batch = [];
    
    for (let j = 0; j < PARALLEL_CHUNKS && i + j < totalChunks; j++) {
      const offset = (i + j) * CHUNK_SIZE;
      batch.push(
        FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
          position: offset,
          length: Math.min(CHUNK_SIZE, fileInfo.size - offset)
        }).then(chunk => ({
          index: i + j,
          data: encryptChunk(Buffer.from(chunk, 'base64'), key)
        }))
      );
    }
    
    const results = await Promise.all(batch);
    results.forEach(r => encryptedChunks[r.index] = r.data);
    
    // Mostrar progreso
    onProgress?.((i + batch.length) / totalChunks);
  }
  
  return Buffer.concat(encryptedChunks);
}
4. Cache inteligente de claves con limpieza automática
typescriptclass SmartKeyCache {
  private cache = new Map();
  private accessCount = new Map();
  private maxSize = 10;
  private ttl = 5 * 60 * 1000;
  
  async getOrDerive(password: string, salt: Uint8Array): Promise<Uint8Array> {
    const cacheKey = `${password}_${Buffer.from(salt).toString('hex')}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.time < this.ttl) {
      this.accessCount.set(cacheKey, (this.accessCount.get(cacheKey) || 0) + 1);
      return cached.key;
    }
    
    // Limpieza LRU si excede tamaño
    if (this.cache.size >= this.maxSize) {
      const leastUsed = [...this.accessCount.entries()]
        .sort((a, b) => a[1] - b[1])[0][0];
      this.cache.delete(leastUsed);
      this.accessCount.delete(leastUsed);
    }
    
    const derived = await this.deriveKeyFast(password, salt);
    this.cache.set(cacheKey, { key: derived, time: Date.now() });
    this.accessCount.set(cacheKey, 1);
    
    return derived;
  }
  
  private async deriveKeyFast(password: string, salt: Uint8Array): Promise<Uint8Array> {
    // Usar Argon2id si está disponible (más rápido y seguro)
    if (this.sodium?.crypto_pwhash) {
      return this.sodium.crypto_pwhash(
        32,
        password,
        salt,
        2, // opslimit
        67108864, // memlimit  
        this.sodium.crypto_pwhash_ALG_ARGON2ID13
      );
    }
    // Fallback a PBKDF2
    return this.pbkdf2(password, salt, 10000);
  }
}
5. Paralelización de campos con batching inteligente
typescriptasync function encryptAllFields(data: any, encryptForSelf: Function) {
  const fieldsToEncrypt = ['title', 'effect', 'secret', 'notes'];
  const validFields = fieldsToEncrypt.filter(f => data[f]?.trim());
  
  // Agrupar por tamaño para balance óptimo
  const grouped = validFields.reduce((acc, field) => {
    const size = data[field].length;
    const bucket = size < 1000 ? 'small' : size < 10000 ? 'medium' : 'large';
    acc[bucket] = acc[bucket] || [];
    acc[bucket].push(field);
    return acc;
  }, {});
  
  // Procesar grupos en paralelo
  const results = await Promise.all(
    Object.entries(grouped).map(async ([size, fields]) => {
      const batchSize = size === 'small' ? 5 : size === 'medium' ? 3 : 1;
      const encrypted = {};
      
      for (let i = 0; i < fields.length; i += batchSize) {
        const batch = fields.slice(i, i + batchSize);
        const encryptedBatch = await Promise.all(
          batch.map(f => encryptForSelf(data[f]).then(e => ({ [f]: e })))
        );
        Object.assign(encrypted, ...encryptedBatch);
      }
      
      return encrypted;
    })
  );
  
  return Object.assign({}, ...results);
}
6. Compresión selectiva pre-cifrado
typescriptimport { compress } from 'react-native-compressor';

async function smartCompress(uri: string, mimeType: string): Promise<string> {
  const fileInfo = await FileSystem.getInfoAsync(uri);
  
  // Videos: comprimir si > 10MB
  if (mimeType.includes('video') && fileInfo.size > 10 * 1024 * 1024) {
    return compress(uri, {
      compressionMethod: 'auto',
      maxWidth: 1280,
      maxHeight: 720,
      bitrate: 2000000
    });
  }
  
  // Imágenes: comprimir si > 2MB
  if (mimeType.includes('image') && fileInfo.size > 2 * 1024 * 1024) {
    return compress(uri, {
      compressionMethod: 'auto',
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.8
    });
  }
  
  return uri;
}
7. Batch upload optimizado para múltiples archivos
typescriptasync function batchEncryptPhotos(photos: string[], encryptionService: any) {
  const SMALL_PHOTO_THRESHOLD = 500 * 1024; // 500KB
  const MIN_BATCH_SIZE = 4;
  
  // Analizar tamaños
  const photoData = await Promise.all(
    photos.map(async uri => {
      const info = await FileSystem.getInfoAsync(uri);
      return { uri, size: info.size };
    })
  );
  
  const avgSize = photoData.reduce((sum, p) => sum + p.size, 0) / photos.length;
  
  // Si son muchas fotos pequeñas, crear un archivo combinado
  if (photos.length >= MIN_BATCH_SIZE && avgSize < SMALL_PHOTO_THRESHOLD) {
    const combinedData = await combinePhotosIntoArchive(photoData);
    return encryptionService.encryptSingleArchive(combinedData);
  }
  
  // Si no, paralelizar con límite
  const CONCURRENT_LIMIT = 3;
  const results = [];
  
  for (let i = 0; i < photos.length; i += CONCURRENT_LIMIT) {
    const batch = photos.slice(i, i + CONCURRENT_LIMIT);
    const encrypted = await Promise.all(
      batch.map(uri => encryptionService.encryptAndUploadFile(uri))
    );
    results.push(...encrypted);
  }
  
  return results;
}
8. Medición y optimización dinámica
typescriptclass PerformanceOptimizer {
  private metrics = new Map();
  
  async measureAndOptimize(operation: string, fn: Function, ...args: any[]) {
    const start = Date.now();
    
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;
      
      // Guardar métricas
      const metrics = this.metrics.get(operation) || [];
      metrics.push({ duration, size: args[0]?.length || 0 });
      this.metrics.set(operation, metrics.slice(-10)); // Últimas 10
      
      // Ajustar estrategia si es lento
      if (duration > 1000 && operation === 'encrypt') {
        return this.retryWithStreaming(fn, args);
      }
      
      return result;
    } catch (error) {
      console.error(`Performance issue in ${operation}:`, error);
      throw error;
    }
  }
  
  getAverageTime(operation: string): number {
    const metrics = this.metrics.get(operation) || [];
    return metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
  }
}
Implementación completa optimizada:
typescript// En FileEncryptionService
async encryptAndUploadFileOptimized(
  uri: string,
  fileName: string,
  mimeType: string,
  userId: string,
  recipients: string[]
) {
  const perf = new PerformanceOptimizer();
  
  // 1. Comprimir si necesario
  console.time('→ compresión');
  const finalUri = await smartCompress(uri, mimeType);
  console.timeEnd('→ compresión');
  
  // 2. Usar streaming para archivos grandes
  const fileInfo = await FileSystem.getInfoAsync(finalUri);
  const useStreaming = fileInfo.size > 5 * 1024 * 1024;
  
  if (useStreaming) {
    return this.encryptLargeFile(finalUri, fileName, mimeType, userId, recipients);
  }
  
  // 3. Cifrado rápido para archivos pequeños
  console.time('→ cifrado');
  const symmetricKey = await this.crypto.generateSymmetricKey();
  const fileData = await FileSystem.readAsStringAsync(finalUri, { encoding: 'base64' });
  const fileBuffer = Buffer.from(fileData, 'base64');
  
  const { encrypted, nonce } = await this.crypto.encrypt(fileBuffer, symmetricKey);
  console.timeEnd('→ cifrado');
  
  // 4. Upload paralelo con reintentos
  const uploaded = await this.uploadWithRetry(encrypted, fileName);
  
  return { fileId: uploaded.id, nonce };
}
Esta guía proporciona una optimización integral que puede reducir los tiempos de cifrado de varios segundos a décimas de segundo para archivos medianos y mantener tiempos razonables para archivos grandes.