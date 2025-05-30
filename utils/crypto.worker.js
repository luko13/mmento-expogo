// utils/crypto.worker.js
import { Buffer } from 'buffer';

// Medición de performance
const performance = {
  now: () => Date.now()
};

self.onmessage = async (e) => {
  const { type, data, id } = e.data;
  const startTime = performance.now();
  
  try {
    let result;
    
    switch(type) {
      case 'base64ToBuffer':
        result = Buffer.from(data, 'base64');
        // Usar ArrayBuffer para transferencia eficiente
        self.postMessage({ 
          id, 
          success: true,
          result: result.buffer,
          duration: performance.now() - startTime
        }, [result.buffer]);
        break;
        
      case 'bufferToBase64':
        result = Buffer.from(data).toString('base64');
        self.postMessage({ 
          id, 
          success: true, 
          result,
          duration: performance.now() - startTime
        });
        break;
        
      case 'encryptBatch':
        // Para cifrado en batch
        const { chunks, key } = data;
        const encrypted = await Promise.all(
          chunks.map(chunk => encryptChunk(chunk, key))
        );
        self.postMessage({ 
          id, 
          success: true, 
          result: encrypted,
          duration: performance.now() - startTime
        });
        break;
        
      case 'batchBase64ToBuffer':
        // Convertir múltiples base64 en paralelo
        const buffers = data.map(b64 => {
          const buffer = Buffer.from(b64, 'base64');
          return buffer.buffer;
        });
        self.postMessage({ 
          id, 
          success: true, 
          result: buffers,
          duration: performance.now() - startTime
        }, buffers);
        break;
        
      default:
        throw new Error(`Unknown operation: ${type}`);
    }
  } catch (error) {
    self.postMessage({ 
      id, 
      success: false, 
      error: error.message,
      duration: performance.now() - startTime
    });
  }
};

// Función auxiliar para cifrado (se expandirá)
async function encryptChunk(chunk, key) {
  // Implementación temporal - se reemplazará con libsodium
  return chunk;
}