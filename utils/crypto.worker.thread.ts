// utils/crypto.worker.thread.ts
import { self } from 'react-native-threads';
import nacl from 'tweetnacl';
import { Buffer } from 'buffer';

// Inicializar PRNG para el worker
const initializePRNG = () => {
  (nacl as any).setPRNG = (fn: (x: Uint8Array, n: number) => void) => {
    nacl.randomBytes = (n: number) => {
      const bytes = new Uint8Array(n);
      fn(bytes, n);
      return bytes;
    };
  };

  // Usar crypto.getRandomValues si está disponible
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    (nacl as any).setPRNG((x: Uint8Array, n: number) => {
      crypto.getRandomValues(x);
    });
  }
};

// Inicializar al cargar el worker
initializePRNG();

// Función de cifrado optimizada
const encryptChunk = (data: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array | null => {
  try {
    return nacl.secretbox(data, nonce, key);
  } catch (error) {
    console.error('Error en cifrado:', error);
    return null;
  }
};

// Función de descifrado
const decryptChunk = (data: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array | null => {
  try {
    return nacl.secretbox.open(data, nonce, key);
  } catch (error) {
    console.error('Error en descifrado:', error);
    return null;
  }
};

// Manejador de mensajes
self.onmessage = (message: string) => {
  const startTime = Date.now();
  
  try {
    const { id, type, data } = JSON.parse(message);
    let result: any;
    
    switch (type) {
      case 'encrypt': {
        const { chunk, key, nonce } = data;
        
        // Convertir de base64 a Uint8Array
        const chunkBuffer = new Uint8Array(Buffer.from(chunk, 'base64'));
        const keyBuffer = new Uint8Array(Buffer.from(key, 'base64'));
        const nonceBuffer = new Uint8Array(Buffer.from(nonce, 'base64'));
        
        // Cifrar
        const encrypted = encryptChunk(chunkBuffer, keyBuffer, nonceBuffer);
        
        if (!encrypted) {
          throw new Error('Cifrado falló');
        }
        
        // Convertir resultado a base64
        result = Buffer.from(encrypted).toString('base64');
        break;
      }
      
      case 'decrypt': {
        const { chunk, key, nonce } = data;
        
        // Convertir de base64 a Uint8Array
        const chunkBuffer = new Uint8Array(Buffer.from(chunk, 'base64'));
        const keyBuffer = new Uint8Array(Buffer.from(key, 'base64'));
        const nonceBuffer = new Uint8Array(Buffer.from(nonce, 'base64'));
        
        // Descifrar
        const decrypted = decryptChunk(chunkBuffer, keyBuffer, nonceBuffer);
        
        if (!decrypted) {
          throw new Error('Descifrado falló');
        }
        
        // Convertir resultado a base64
        result = Buffer.from(decrypted).toString('base64');
        break;
      }
      
      case 'encryptBatch': {
        const { chunks, key, nonces } = data;
        
        const keyBuffer = new Uint8Array(Buffer.from(key, 'base64'));
        const results: string[] = [];
        
        for (let i = 0; i < chunks.length; i++) {
          const chunkBuffer = new Uint8Array(Buffer.from(chunks[i], 'base64'));
          const nonceBuffer = new Uint8Array(Buffer.from(nonces[i], 'base64'));
          
          const encrypted = encryptChunk(chunkBuffer, keyBuffer, nonceBuffer);
          
          if (!encrypted) {
            throw new Error(`Cifrado falló en chunk ${i}`);
          }
          
          results.push(Buffer.from(encrypted).toString('base64'));
        }
        
        result = results;
        break;
      }
      
      case 'generateNonce': {
        const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
        result = Buffer.from(nonce).toString('base64');
        break;
      }
      
      default:
        throw new Error(`Operación desconocida: ${type}`);
    }
    
    const duration = Date.now() - startTime;
    
    // Enviar respuesta
    self.postMessage(JSON.stringify({
      id,
      success: true,
      result,
      duration
    }));
    
  } catch (error: any) {
    self.postMessage(JSON.stringify({
      id: JSON.parse(message).id,
      success: false,
      error: error.message || 'Error desconocido',
      duration: Date.now() - startTime
    }));
  }
};

// Señal de que el worker está listo
self.postMessage(JSON.stringify({
  type: 'ready',
  success: true
}));