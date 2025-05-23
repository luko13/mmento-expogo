// utils/cryptoService.ts - Fixed version with PRNG initialization
import 'react-native-get-random-values';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

export interface EncryptedData {
  ciphertext: string;
  nonce: string;
  senderPublicKey?: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export class CryptoService {
  private static instance: CryptoService;
  private isInitialized = false;

  private constructor() {
    this.initializePRNG();
  }

  static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  /**
   * Initialize PRNG for TweetNaCl
   */
  private initializePRNG(): void {
    try {
      // Override nacl's random function with expo-crypto
      (nacl as any).setPRNG = (fn: (x: Uint8Array, n: number) => void) => {
        nacl.randomBytes = (n: number) => {
          const bytes = new Uint8Array(n);
          fn(bytes, n);
          return bytes;
        };
      };

      // Set custom PRNG using expo-crypto
      (nacl as any).setPRNG((x: Uint8Array, n: number) => {
        const randomBytes = Crypto.getRandomBytes(n);
        x.set(randomBytes);
      });

      this.isInitialized = true;
      console.log('CryptoService PRNG initialized successfully');
    } catch (error) {
      console.error('Error initializing PRNG:', error);
      
      // Fallback: try to use built-in crypto if available
      try {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
          (nacl as any).setPRNG((x: Uint8Array, n: number) => {
            crypto.getRandomValues(x);
          });
          this.isInitialized = true;
          console.log('CryptoService PRNG initialized with fallback');
        } else {
          throw new Error('No secure random number generator available');
        }
      } catch (fallbackError) {
        console.error('Fallback PRNG initialization failed:', fallbackError);
      }
    }
  }

  /**
   * Ensure PRNG is initialized before any crypto operations
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      this.initializePRNG();
    }
    if (!this.isInitialized) {
      throw new Error('CryptoService not properly initialized - no PRNG available');
    }
  }

  /**
   * Genera un nuevo par de claves para el usuario
   */
  async generateKeyPair(): Promise<KeyPair> {
    this.ensureInitialized();
    
    try {
      const keyPair = nacl.box.keyPair();
      return {
        publicKey: encodeBase64(keyPair.publicKey),
        privateKey: encodeBase64(keyPair.secretKey),
      };
    } catch (error) {
      console.error('Error generating key pair:', error);
      throw new Error('Error al generar par de claves: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  /**
   * Guarda la clave privada en SecureStore
   */
  async storePrivateKey(privateKey: string, userId: string): Promise<void> {
    await SecureStore.setItemAsync(`privateKey_${userId}`, privateKey);
  }

  /**
   * Recupera la clave privada del usuario actual
   */
  async getPrivateKey(userId: string): Promise<string | null> {
    return await SecureStore.getItemAsync(`privateKey_${userId}`);
  }

  /**
   * Cifra texto usando claves asimétricas (para mensajes, descripciones)
   */
  async encryptText(
    plaintext: string,
    recipientPublicKey: string,
    senderPrivateKey: string
  ): Promise<EncryptedData> {
    this.ensureInitialized();
    
    try {
      const message = decodeUTF8(plaintext);
      const nonce = nacl.randomBytes(nacl.box.nonceLength);
      const publicKey = decodeBase64(recipientPublicKey);
      const privateKey = decodeBase64(senderPrivateKey);

      const encrypted = nacl.box(message, nonce, publicKey, privateKey);
      
      if (!encrypted) {
        throw new Error('Encryption failed');
      }
      
      return {
        ciphertext: encodeBase64(encrypted),
        nonce: encodeBase64(nonce),
      };
    } catch (error) {
      console.error('Error encrypting text:', error);
      throw new Error('Error al cifrar texto: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  /**
   * Descifra texto usando claves asimétricas
   */
  async decryptText(
    encryptedData: EncryptedData,
    senderPublicKey: string,
    recipientPrivateKey: string
  ): Promise<string> {
    this.ensureInitialized();
    
    try {
      const ciphertext = decodeBase64(encryptedData.ciphertext);
      const nonce = decodeBase64(encryptedData.nonce);
      const publicKey = decodeBase64(senderPublicKey);
      const privateKey = decodeBase64(recipientPrivateKey);

      const decrypted = nacl.box.open(ciphertext, nonce, publicKey, privateKey);
      
      if (!decrypted) {
        throw new Error('Decryption failed - invalid data or keys');
      }

      return encodeUTF8(decrypted);
    } catch (error) {
      console.error('Error decrypting text:', error);
      throw new Error('Error al descifrar texto: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  /**
   * Genera una clave simétrica usando TweetNaCl (32 bytes)
   */
  async generateSymmetricKey(): Promise<Uint8Array> {
    this.ensureInitialized();
    return nacl.randomBytes(32);
  }

  /**
   * Cifra una clave simétrica usando claves asimétricas
   */
  async encryptSymmetricKey(
    symmetricKey: Uint8Array,
    recipientPublicKey: string,
    senderPrivateKey: string
  ): Promise<EncryptedData> {
    this.ensureInitialized();
    
    try {
      const nonce = nacl.randomBytes(nacl.box.nonceLength);
      const publicKey = decodeBase64(recipientPublicKey);
      const privateKey = decodeBase64(senderPrivateKey);

      const encrypted = nacl.box(symmetricKey, nonce, publicKey, privateKey);
      
      if (!encrypted) {
        throw new Error('Symmetric key encryption failed');
      }
      
      return {
        ciphertext: encodeBase64(encrypted),
        nonce: encodeBase64(nonce),
      };
    } catch (error) {
      console.error('Error encrypting symmetric key:', error);
      throw new Error('Error al cifrar clave simétrica: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  /**
   * Descifra una clave simétrica
   */
  async decryptSymmetricKey(
    encryptedKey: EncryptedData,
    senderPublicKey: string,
    recipientPrivateKey: string
  ): Promise<Uint8Array> {
    this.ensureInitialized();
    
    try {
      const ciphertext = decodeBase64(encryptedKey.ciphertext);
      const nonce = decodeBase64(encryptedKey.nonce);
      const publicKey = decodeBase64(senderPublicKey);
      const privateKey = decodeBase64(recipientPrivateKey);

      const decrypted = nacl.box.open(ciphertext, nonce, publicKey, privateKey);
      
      if (!decrypted) {
        throw new Error('Symmetric key decryption failed');
      }

      return decrypted;
    } catch (error) {
      console.error('Error decrypting symmetric key:', error);
      throw new Error('Error al descifrar clave simétrica: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  /**
   * Cifrado simple para archivos usando TweetNaCl secretbox
   */
  async encryptFile(data: Uint8Array, key: Uint8Array): Promise<{
    encrypted: Uint8Array;
    nonce: Uint8Array;
  }> {
    this.ensureInitialized();
    
    try {
      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
      const encrypted = nacl.secretbox(data, nonce, key);
      
      if (!encrypted) {
        throw new Error('File encryption failed');
      }
      
      return { encrypted, nonce };
    } catch (error) {
      console.error('Error encrypting file:', error);
      throw new Error('Error al cifrar archivo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  /**
   * Descifrado simple para archivos
   */
  async decryptFile(
    encrypted: Uint8Array,
    nonce: Uint8Array,
    key: Uint8Array
  ): Promise<Uint8Array> {
    this.ensureInitialized();
    
    try {
      const decrypted = nacl.secretbox.open(encrypted, nonce, key);
      
      if (!decrypted) {
        throw new Error('File decryption failed');
      }
      
      return decrypted;
    } catch (error) {
      console.error('Error decrypting file:', error);
      throw new Error('Error al descifrar archivo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  /**
   * Cifrado simple para datos no sensibles usando TweetNaCl SecretBox
   */
  async encryptForSelf(plaintext: string, userPrivateKey: string): Promise<string> {
    this.ensureInitialized();
    
    try {
      // Derivar una clave de 32 bytes desde la clave privada usando hash
      const derivedKey = nacl.hash(decodeBase64(userPrivateKey)).slice(0, 32);
      
      // Convertir texto a bytes
      const message = decodeUTF8(plaintext);
      
      // Generar nonce aleatorio
      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
      
      // Cifrar usando secretbox (XSalsa20-Poly1305)
      const encrypted = nacl.secretbox(message, nonce, derivedKey);
      
      if (!encrypted) {
        throw new Error('Self encryption failed');
      }
      
      return JSON.stringify({
        ciphertext: encodeBase64(encrypted),
        nonce: encodeBase64(nonce),
        version: 'nacl_secretbox_v1'
      });
    } catch (error) {
      console.error('Error en encryptForSelf:', error);
      throw new Error('Error al cifrar datos personales: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  /**
   * Descifrado simple para datos propios usando TweetNaCl SecretBox
   */
  async decryptForSelf(encryptedData: string, userPrivateKey: string): Promise<string> {
    this.ensureInitialized();
    
    try {
      const parsedData = JSON.parse(encryptedData);
      const { ciphertext, nonce } = parsedData;
      
      if (!ciphertext || !nonce) {
        throw new Error('Invalid encrypted data format');
      }
      
      // Derivar la misma clave de 32 bytes
      const derivedKey = nacl.hash(decodeBase64(userPrivateKey)).slice(0, 32);
      
      // Descifrar usando secretbox
      const decrypted = nacl.secretbox.open(
        decodeBase64(ciphertext),
        decodeBase64(nonce),
        derivedKey
      );
      
      if (!decrypted) {
        throw new Error('Self decryption failed - invalid data or key');
      }
      
      return encodeUTF8(decrypted);
    } catch (error) {
      console.error('Error en decryptForSelf:', error);
      throw new Error('Error al descifrar datos personales: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }
}