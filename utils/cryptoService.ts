// utils/cryptoService.ts - Fixed version
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

  private constructor() {
    // Remove libsodium initialization - use TweetNaCl only
  }

  static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  /**
   * Genera un nuevo par de claves para el usuario
   */
  async generateKeyPair(): Promise<KeyPair> {
    const keyPair = nacl.box.keyPair();
    return {
      publicKey: encodeBase64(keyPair.publicKey),
      privateKey: encodeBase64(keyPair.secretKey),
    };
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
    const message = decodeUTF8(plaintext);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const publicKey = decodeBase64(recipientPublicKey);
    const privateKey = decodeBase64(senderPrivateKey);

    const encrypted = nacl.box(message, nonce, publicKey, privateKey);
    
    return {
      ciphertext: encodeBase64(encrypted),
      nonce: encodeBase64(nonce),
    };
  }

  /**
   * Descifra texto usando claves asimétricas
   */
  async decryptText(
    encryptedData: EncryptedData,
    senderPublicKey: string,
    recipientPrivateKey: string
  ): Promise<string> {
    const ciphertext = decodeBase64(encryptedData.ciphertext);
    const nonce = decodeBase64(encryptedData.nonce);
    const publicKey = decodeBase64(senderPublicKey);
    const privateKey = decodeBase64(recipientPrivateKey);

    const decrypted = nacl.box.open(ciphertext, nonce, publicKey, privateKey);
    
    if (!decrypted) {
      throw new Error('Error al descifrar: datos inválidos o claves incorrectas');
    }

    return encodeUTF8(decrypted);
  }

  /**
   * Genera una clave simétrica usando TweetNaCl (32 bytes)
   */
  async generateSymmetricKey(): Promise<Uint8Array> {
    return nacl.randomBytes(32); // Use TweetNaCl instead of libsodium
  }

  /**
   * Cifra una clave simétrica usando claves asimétricas
   */
  async encryptSymmetricKey(
    symmetricKey: Uint8Array,
    recipientPublicKey: string,
    senderPrivateKey: string
  ): Promise<EncryptedData> {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const publicKey = decodeBase64(recipientPublicKey);
    const privateKey = decodeBase64(senderPrivateKey);

    const encrypted = nacl.box(symmetricKey, nonce, publicKey, privateKey);
    
    return {
      ciphertext: encodeBase64(encrypted),
      nonce: encodeBase64(nonce),
    };
  }

  /**
   * Descifra una clave simétrica
   */
  async decryptSymmetricKey(
    encryptedKey: EncryptedData,
    senderPublicKey: string,
    recipientPrivateKey: string
  ): Promise<Uint8Array> {
    const ciphertext = decodeBase64(encryptedKey.ciphertext);
    const nonce = decodeBase64(encryptedKey.nonce);
    const publicKey = decodeBase64(senderPublicKey);
    const privateKey = decodeBase64(recipientPrivateKey);

    const decrypted = nacl.box.open(ciphertext, nonce, publicKey, privateKey);
    
    if (!decrypted) {
      throw new Error('Error al descifrar clave simétrica');
    }

    return decrypted;
  }

  /**
   * Cifrado simple para archivos usando TweetNaCl secretbox
   */
  async encryptFile(data: Uint8Array, key: Uint8Array): Promise<{
    encrypted: Uint8Array;
    nonce: Uint8Array;
  }> {
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const encrypted = nacl.secretbox(data, nonce, key);
    
    if (!encrypted) {
      throw new Error('Error al cifrar archivo');
    }
    
    return { encrypted, nonce };
  }

  /**
   * Descifrado simple para archivos
   */
  async decryptFile(
    encrypted: Uint8Array,
    nonce: Uint8Array,
    key: Uint8Array
  ): Promise<Uint8Array> {
    const decrypted = nacl.secretbox.open(encrypted, nonce, key);
    
    if (!decrypted) {
      throw new Error('Error al descifrar archivo');
    }
    
    return decrypted;
  }

  /**
   * Cifrado simple para datos no sensibles usando TweetNaCl SecretBox
   */
  async encryptForSelf(plaintext: string, userPrivateKey: string): Promise<string> {
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
        throw new Error('Error al cifrar datos');
      }
      
      return JSON.stringify({
        ciphertext: encodeBase64(encrypted),
        nonce: encodeBase64(nonce),
        version: 'nacl_secretbox_v1'
      });
    } catch (error) {
      console.error('Error en encryptForSelf:', error);
      throw new Error('Error al cifrar datos personales');
    }
  }

  /**
   * Descifrado simple para datos propios usando TweetNaCl SecretBox
   */
  async decryptForSelf(encryptedData: string, userPrivateKey: string): Promise<string> {
    try {
      const parsedData = JSON.parse(encryptedData);
      const { ciphertext, nonce } = parsedData;
      
      if (!ciphertext || !nonce) {
        throw new Error('Datos cifrados inválidos');
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
        throw new Error('Error al descifrar: datos inválidos o clave incorrecta');
      }
      
      return encodeUTF8(decrypted);
    } catch (error) {
      console.error('Error en decryptForSelf:', error);
      throw new Error('Error al descifrar datos personales');
    }
  }
}