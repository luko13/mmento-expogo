// utils/cryptoService.ts
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import _sodium from 'libsodium-wrappers';

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
  private sodiumReady = false;
  private sodium: any;

  private constructor() {
    this.initializeSodium();
  }

  static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  private async initializeSodium(): Promise<void> {
    try {
      await _sodium.ready;
      this.sodium = _sodium;
      this.sodiumReady = true;
    } catch (error) {
      console.error('Error inicializando libsodium:', error);
    }
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
   * Genera una clave simétrica para cifrado de archivos grandes
   */
  async generateSymmetricKey(): Promise<Uint8Array> {
    if (!this.sodiumReady) {
      await this.initializeSodium();
    }
    return this.sodium.crypto_secretstream_xchacha20poly1305_keygen();
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
   * Inicializa el cifrado de stream para archivos grandes
   */
  async initStreamEncryption(key: Uint8Array): Promise<{
    state: any;
    header: Uint8Array;
  }> {
    if (!this.sodiumReady) {
      await this.initializeSodium();
    }
    
    return this.sodium.crypto_secretstream_xchacha20poly1305_init_push(key);
  }

  /**
   * Cifra un chunk de datos en stream
   */
  async encryptChunk(
    state: any,
    chunk: Uint8Array,
    isLastChunk: boolean = false
  ): Promise<Uint8Array> {
    const tag = isLastChunk
      ? this.sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
      : this.sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;

    return this.sodium.crypto_secretstream_xchacha20poly1305_push(
      state,
      chunk,
      null,
      tag
    );
  }

  /**
   * Inicializa el descifrado de stream
   */
  async initStreamDecryption(header: Uint8Array, key: Uint8Array): Promise<any> {
    if (!this.sodiumReady) {
      await this.initializeSodium();
    }
    
    return this.sodium.crypto_secretstream_xchacha20poly1305_init_pull(header, key);
  }

  /**
   * Descifra un chunk de datos en stream
   */
  async decryptChunk(state: any, encryptedChunk: Uint8Array): Promise<{
    message: Uint8Array;
    tag: number;
  }> {
    return this.sodium.crypto_secretstream_xchacha20poly1305_pull(state, encryptedChunk, null);
  }

  /**
   * Cifrado simple para datos no sensibles usando TweetNaCl SecretBox
   * Esta implementación es más confiable que crypto-es
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
        version: 'nacl_secretbox_v1' // Para compatibilidad futura
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