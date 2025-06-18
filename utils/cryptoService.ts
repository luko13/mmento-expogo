// utils/cryptoService.ts - VERSIÓN ARREGLADA
import { keyCache } from "./smartKeyCache";
import { Buffer } from "buffer";
import "react-native-get-random-values"; // CRÍTICO: Debe estar al principio
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import nacl from "tweetnacl";
import {
  encodeBase64,
  decodeBase64,
  encodeUTF8,
  decodeUTF8,
} from "tweetnacl-util";
import { supabase } from "../lib/supabase";
import { hybridCrypto } from "./hybridCrypto";

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
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    // NO llamar initialize aquí - será llamado bajo demanda
  }

  static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  /**
   * Initialize crypto services - ahora es async y más robusto
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Si ya está inicializando, esperar
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitialize();
    await this.initializationPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      console.log("🔐 Inicializando CryptoService...");
      
      // 1. Inicializar PRNG PRIMERO
      await this.initializePRNG();
      
      // 2. Luego inicializar hybrid crypto
      await hybridCrypto.initialize();

      this.isInitialized = true;
      console.log("✅ CryptoService inicializado correctamente");
    } catch (error) {
      console.error("❌ Error initializing crypto:", error);
      
      // Intentar inicialización básica como fallback
      try {
        await this.basicInitialization();
        this.isInitialized = true;
        console.log("✅ CryptoService inicializado con fallback básico");
      } catch (fallbackError) {
        console.error("❌ Fallback initialization también falló:", fallbackError);
        throw new Error("No se pudo inicializar el servicio de criptografía");
      }
    }
  }

  /**
   * PRNG initialization mejorado con múltiples fallbacks
   */
  private async initializePRNG(): Promise<void> {
    console.log("🎲 Inicializando PRNG...");
    
    try {
      // Método 1: Expo Crypto (preferido)
      const testBytes = Crypto.getRandomBytes(16);
      if (testBytes && testBytes.length === 16) {
        (nacl as any).setPRNG = (fn: (x: Uint8Array, n: number) => void) => {
          nacl.randomBytes = (n: number) => {
            return Crypto.getRandomBytes(n);
          };
        };

        (nacl as any).setPRNG((x: Uint8Array, n: number) => {
          const randomBytes = Crypto.getRandomBytes(n);
          x.set(randomBytes);
        });

        console.log("✅ PRNG inicializado con Expo.Crypto");
        return;
      }
    } catch (error) {
      console.warn("⚠️ Expo.Crypto no disponible:", error);
    }

    try {
      // Método 2: Web Crypto API
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        (nacl as any).setPRNG = (fn: (x: Uint8Array, n: number) => void) => {
          nacl.randomBytes = (n: number) => {
            const bytes = new Uint8Array(n);
            crypto.getRandomValues(bytes);
            return bytes;
          };
        };

        (nacl as any).setPRNG((x: Uint8Array, n: number) => {
          crypto.getRandomValues(x);
        });

        console.log("✅ PRNG inicializado con Web Crypto API");
        return;
      }
    } catch (error) {
      console.warn("⚠️ Web Crypto API no disponible:", error);
    }

    try {
      // Método 3: react-native-get-random-values
      if (typeof global !== "undefined" && global.crypto?.getRandomValues) {
        (nacl as any).setPRNG = (fn: (x: Uint8Array, n: number) => void) => {
          nacl.randomBytes = (n: number) => {
            const bytes = new Uint8Array(n);
            global.crypto.getRandomValues(bytes);
            return bytes;
          };
        };

        (nacl as any).setPRNG((x: Uint8Array, n: number) => {
          global.crypto.getRandomValues(x);
        });

        console.log("✅ PRNG inicializado con react-native-get-random-values");
        return;
      }
    } catch (error) {
      console.warn("⚠️ react-native-get-random-values no disponible:", error);
    }

    // Método 4: Fallback básico (NO SEGURO - solo para desarrollo)
    console.error("🚨 USANDO PRNG NO SEGURO - SOLO PARA DESARROLLO");
    (nacl as any).setPRNG = (fn: (x: Uint8Array, n: number) => void) => {
      nacl.randomBytes = (n: number) => {
        const bytes = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          bytes[i] = Math.floor(Math.random() * 256);
        }
        return bytes;
      };
    };

    (nacl as any).setPRNG((x: Uint8Array, n: number) => {
      for (let i = 0; i < n; i++) {
        x[i] = Math.floor(Math.random() * 256);
      }
    });

    console.log("⚠️ PRNG inicializado con fallback inseguro");
  }

  /**
   * Inicialización básica sin híbrido
   */
  private async basicInitialization(): Promise<void> {
    await this.initializePRNG();
    
    // Verificar que funciona
    const testBytes = nacl.randomBytes(16);
    if (!testBytes || testBytes.length !== 16) {
      throw new Error("PRNG no funciona correctamente");
    }
    
    console.log("✅ Inicialización básica completada");
  }

  /**
   * Método para asegurar inicialización antes de usar
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.isInitialized) {
      throw new Error("CryptoService no se pudo inicializar correctamente");
    }
  }

  /**
   * Test the crypto service
   */
  async testCryptoService(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      
      // Test basic random generation
      const testBytes = nacl.randomBytes(32);
      if (!testBytes || testBytes.length !== 32) {
        throw new Error("Random generation failed");
      }
      
      // Test key generation
      const keyPair = nacl.box.keyPair();
      if (!keyPair.publicKey || !keyPair.secretKey) {
        throw new Error("Key generation failed");
      }
      
      console.log("✅ CryptoService test passed");
      return true;
    } catch (error) {
      console.error("❌ CryptoService test failed:", error);
      return false;
    }
  }

  // ==== MÉTODOS PÚBLICOS CON INICIALIZACIÓN AUTOMÁTICA ====

  async generateKeyPairWithCloudBackup(
    userId: string,
    password: string
  ): Promise<KeyPair> {
    await this.ensureInitialized();

    const keyPair = nacl.box.keyPair();
    const result = {
      publicKey: encodeBase64(keyPair.publicKey),
      privateKey: encodeBase64(keyPair.secretKey),
    };

    // Store locally
    await this.storePrivateKey(result.privateKey, userId);

    // Store encrypted in cloud
    await this.storePrivateKeyInCloud(result.privateKey, userId, password);

    // Update public key in profile
    const { error } = await supabase
      .from("profiles")
      .update({ public_key: result.publicKey })
      .eq("id", userId);

    if (error) {
      console.error("Error updating public key:", error);
    }

    return result;
  }

  async initializeFromCloud(
    userId: string,
    password: string
  ): Promise<KeyPair | null> {
    try {
      await this.ensureInitialized();
      
      // First, check if we have cloud backup
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "public_key, encrypted_private_key, private_key_salt, private_key_nonce"
        )
        .eq("id", userId)
        .single();

      if (!profile?.encrypted_private_key || !profile?.public_key) {
        return null;
      }

      // Try to retrieve from cloud
      const cloudPrivateKey = await this.retrievePrivateKeyFromCloud(
        userId,
        password
      );

      if (!cloudPrivateKey) {
        console.error("Failed to retrieve private key from cloud");
        return null;
      }

      // Validate the key pair
      const keyPair = {
        publicKey: profile.public_key,
        privateKey: cloudPrivateKey,
      };

      // Test the key pair with a simple encryption/decryption
      try {
        const testMessage = "test";
        const encrypted = await this.encryptForSelf(
          testMessage,
          keyPair.privateKey
        );
        const decrypted = await this.decryptForSelf(
          encrypted,
          keyPair.privateKey
        );

        if (decrypted !== testMessage) {
          throw new Error("Key validation failed");
        }
      } catch (error) {
        console.error("Key pair validation failed:", error);
        return null;
      }

      // Store locally for future use
      await this.storePrivateKey(cloudPrivateKey, userId);
      return keyPair;
    } catch (error) {
      console.error("Error in initializeFromCloud:", error);
      return null;
    }
  }

  // ==== RESTO DE MÉTODOS (mantener igual pero agregar ensureInitialized) ====

  /**
   * Derive encryption key from password using best available method
   */
  private async deriveKeyFromPassword(
    password: string,
    salt: Uint8Array
  ): Promise<Uint8Array> {
    // Use smart cache
    return keyCache.getOrDerive(password, salt, 10000);
  }

  /**
   * Encrypt private key with password for cloud storage
   */
  async encryptPrivateKeyForCloud(
    privateKey: string,
    password: string
  ): Promise<{ encryptedKey: string; salt: string; nonce: string }> {
    await this.ensureInitialized();
    await hybridCrypto.initialize();

    const salt = await hybridCrypto.generateNonce(); // Use as salt
    const derivedKey = await this.deriveKeyFromPassword(password, salt);

    const privateKeyBytes = decodeBase64(privateKey);
    const { encrypted, nonce } = await hybridCrypto.encrypt(
      privateKeyBytes,
      derivedKey
    );

    return {
      encryptedKey: encodeBase64(encrypted),
      salt: encodeBase64(salt),
      nonce: encodeBase64(nonce),
    };
  }

  /**
   * Decrypt private key from cloud storage
   */
  async decryptPrivateKeyFromCloud(
    encryptedData: { encryptedKey: string; salt: string; nonce: string },
    password: string
  ): Promise<string> {
    await this.ensureInitialized();
    await hybridCrypto.initialize();

    const salt = decodeBase64(encryptedData.salt);
    const derivedKey = await this.deriveKeyFromPassword(password, salt);

    const encrypted = decodeBase64(encryptedData.encryptedKey);
    const nonce = decodeBase64(encryptedData.nonce);

    const decrypted = await hybridCrypto.decrypt(encrypted, derivedKey, nonce);
    return encodeBase64(decrypted);
  }

  /**
   * Store encrypted private key in cloud
   */
  async storePrivateKeyInCloud(
    privateKey: string,
    userId: string,
    password: string
  ): Promise<void> {
    const encryptedData = await this.encryptPrivateKeyForCloud(
      privateKey,
      password
    );

    const { error } = await supabase
      .from("profiles")
      .update({
        encrypted_private_key: encryptedData.encryptedKey,
        private_key_salt: encryptedData.salt,
        private_key_nonce: encryptedData.nonce,
        encryption_initialized_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      throw new Error(`Failed to store encrypted key: ${error.message}`);
    }
  }

  /**
   * Retrieve and decrypt private key from cloud
   */
  async retrievePrivateKeyFromCloud(
    userId: string,
    password: string
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("encrypted_private_key, private_key_salt, private_key_nonce")
      .eq("id", userId)
      .single();

    if (error || !data?.encrypted_private_key) {
      return null;
    }

    try {
      const decryptedKey = await this.decryptPrivateKeyFromCloud(
        {
          encryptedKey: data.encrypted_private_key,
          salt: data.private_key_salt,
          nonce: data.private_key_nonce,
        },
        password
      );
      return decryptedKey;
    } catch (error) {
      console.error("Failed to decrypt private key:", error);
      return null;
    }
  }

  // ==== MÉTODOS SIMPLES (agregar ensureInitialized) ====

  async storePrivateKey(privateKey: string, userId: string): Promise<void> {
    await SecureStore.setItemAsync(`privateKey_${userId}`, privateKey);
  }

  async getPrivateKey(userId: string): Promise<string | null> {
    return await SecureStore.getItemAsync(`privateKey_${userId}`);
  }

  async clearLocalKeys(userId: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(`privateKey_${userId}`);
    } catch (error) {
      console.error("Error clearing local keys:", error);
    }
  }

  async encryptForSelf(
    plaintext: string,
    userPrivateKey: string
  ): Promise<string> {
    await this.ensureInitialized();
    await hybridCrypto.initialize();

    try {
      // Use a consistent key derivation method
      const privateKeyBytes = decodeBase64(userPrivateKey);
      const derivedKey = nacl.hash(privateKeyBytes).slice(0, 32);

      const message = decodeUTF8(plaintext);
      const { encrypted, nonce } = await hybridCrypto.encrypt(
        message,
        derivedKey
      );

      const result = JSON.stringify({
        ciphertext: encodeBase64(encrypted),
        nonce: encodeBase64(nonce),
        version: "nacl_secretbox_v1",
      });

      return result;
    } catch (error) {
      console.error("Error en encryptForSelf:", error);
      throw new Error(
        "Error al cifrar datos personales: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  async decryptForSelf(
    encryptedData: string | any,
    userPrivateKey: string
  ): Promise<string> {
    await this.ensureInitialized();
    await hybridCrypto.initialize();

    // Si ya es un objeto, usarlo directamente
    const parsed =
      typeof encryptedData === "string"
        ? JSON.parse(encryptedData)
        : encryptedData;

    const { ciphertext, nonce, version } = parsed;

    if (!ciphertext || !nonce) {
      throw new Error("Invalid encrypted data format");
    }

    try {
      // Use the same key derivation method as encryption
      const privateKeyBytes = decodeBase64(userPrivateKey);
      const derivedKey = nacl.hash(privateKeyBytes).slice(0, 32);

      const decrypted = await hybridCrypto.decrypt(
        decodeBase64(ciphertext),
        derivedKey,
        decodeBase64(nonce)
      );

      return encodeUTF8(decrypted);
    } catch (error: any) {
      console.error("Error en decryptForSelf:", error);
      throw new Error(
        "Error al descifrar datos personales: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  // ==== MÉTODOS DE CIFRADO DE TEXTO ====

  async encryptText(
    plaintext: string,
    recipientPublicKey: string,
    senderPrivateKey: string
  ): Promise<EncryptedData> {
    await this.ensureInitialized();

    try {
      const message = decodeUTF8(plaintext);
      const nonce = nacl.randomBytes(nacl.box.nonceLength);
      const publicKey = decodeBase64(recipientPublicKey);
      const privateKey = decodeBase64(senderPrivateKey);

      const encrypted = nacl.box(message, nonce, publicKey, privateKey);

      if (!encrypted) {
        throw new Error("Encryption failed");
      }

      return {
        ciphertext: encodeBase64(encrypted),
        nonce: encodeBase64(nonce),
      };
    } catch (error) {
      console.error("Error encrypting text:", error);
      throw new Error(
        "Error al cifrar texto: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  async decryptText(
    encryptedData: EncryptedData,
    senderPublicKey: string,
    recipientPrivateKey: string
  ): Promise<string> {
    await this.ensureInitialized();

    try {
      const ciphertext = decodeBase64(encryptedData.ciphertext);
      const nonce = decodeBase64(encryptedData.nonce);
      const publicKey = decodeBase64(senderPublicKey);
      const privateKey = decodeBase64(recipientPrivateKey);

      const decrypted = nacl.box.open(ciphertext, nonce, publicKey, privateKey);

      if (!decrypted) {
        throw new Error("Decryption failed - invalid data or keys");
      }

      return encodeUTF8(decrypted);
    } catch (error) {
      console.error("Error decrypting text:", error);
      throw new Error(
        "Error al descifrar texto: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  // ==== MÉTODOS DE CLAVES SIMÉTRICAS ====

  async generateSymmetricKey(): Promise<Uint8Array> {
    await this.ensureInitialized();
    return hybridCrypto.generateKey();
  }

  async generateNonce(): Promise<Uint8Array> {
    await this.ensureInitialized();
    return hybridCrypto.generateNonce();
  }

  async encryptSymmetricKey(
    symmetricKey: Uint8Array,
    recipientPublicKey: string,
    senderPrivateKey: string
  ): Promise<EncryptedData> {
    await this.ensureInitialized();

    try {
      const nonce = nacl.randomBytes(nacl.box.nonceLength);
      const publicKey = decodeBase64(recipientPublicKey);
      const privateKey = decodeBase64(senderPrivateKey);

      const encrypted = nacl.box(symmetricKey, nonce, publicKey, privateKey);

      if (!encrypted) {
        throw new Error("Symmetric key encryption failed");
      }

      return {
        ciphertext: encodeBase64(encrypted),
        nonce: encodeBase64(nonce),
      };
    } catch (error) {
      console.error("Error encrypting symmetric key:", error);
      throw new Error(
        "Error al cifrar clave simétrica: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  async decryptSymmetricKey(
    encryptedKey: EncryptedData,
    senderPublicKey: string,
    recipientPrivateKey: string
  ): Promise<Uint8Array> {
    await this.ensureInitialized();

    try {
      const ciphertext = decodeBase64(encryptedKey.ciphertext);
      const nonce = decodeBase64(encryptedKey.nonce);
      const publicKey = decodeBase64(senderPublicKey);
      const privateKey = decodeBase64(recipientPrivateKey);

      const decrypted = nacl.box.open(ciphertext, nonce, publicKey, privateKey);

      if (!decrypted) {
        throw new Error("Symmetric key decryption failed");
      }
      return decrypted;
    } catch (error) {
      console.error("Error decrypting symmetric key:", error);
      throw new Error(
        "Error al descifrar clave simétrica: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  // ==== MÉTODOS DE CIFRADO DE ARCHIVOS ====

  async encryptFile(
    data: Uint8Array,
    key: Uint8Array
  ): Promise<{
    encrypted: Uint8Array;
    nonce: Uint8Array;
  }> {
    await this.ensureInitialized();
    
    console.log("🔐 encryptFile:");
    console.log("- Input size:", data.length);
    try {
      const result = await hybridCrypto.encrypt(data, key);
      console.log("- Output size:", result.encrypted.length);
      console.log("- Overhead:", result.encrypted.length - data.length);
      console.log("- Nonce size:", result.nonce.length);
      return result;
    } catch (error) {
      console.error("Error encrypting file:", error);
      throw new Error(
        "Error al cifrar archivo: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  async decryptFile(
    encrypted: Uint8Array,
    nonce: Uint8Array,
    key: Uint8Array
  ): Promise<Uint8Array> {
    await this.ensureInitialized();
    
    try {
      const decrypted = await hybridCrypto.decrypt(encrypted, key, nonce);
      return decrypted;
    } catch (error) {
      console.error("❌ decryptFile failed:", error);
      console.error("Nonce as hex:", Buffer.from(nonce).toString("hex"));
      console.error("Key as hex:", Buffer.from(key).toString("hex"));
      throw new Error(
        "Error al descifrar archivo: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  // ==== MÉTODOS DEPRECADOS (para compatibilidad) ====

  /**
   * @deprecated Use generateKeyPairWithCloudBackup instead
   */
  async generateKeyPair(): Promise<KeyPair> {
    console.warn(
      "generateKeyPair is deprecated. Use generateKeyPairWithCloudBackup instead."
    );
    await this.ensureInitialized();

    try {
      const keyPair = nacl.box.keyPair();
      return {
        publicKey: encodeBase64(keyPair.publicKey),
        privateKey: encodeBase64(keyPair.secretKey),
      };
    } catch (error) {
      console.error("Error generating key pair:", error);
      throw new Error(
        "Error al generar par de claves: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }
}