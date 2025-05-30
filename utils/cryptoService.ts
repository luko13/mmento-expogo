import { keyCache } from "./smartKeyCache";
import "react-native-get-random-values";
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

  private constructor() {
    this.initialize();
  }

  static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  /**
   * Initialize crypto services
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize PRNG for TweetNaCl (fallback)
      this.initializePRNG();

      // Initialize hybrid crypto
      await hybridCrypto.initialize();
      console.log(
        `🔐 Crypto initialized: ${hybridCrypto.getImplementationName()}`
      );

      this.isInitialized = true;
    } catch (error) {
      console.error("Error initializing crypto:", error);
      // Continue with basic initialization
      this.initializePRNG();
      this.isInitialized = true;
    }
  }

  /**
   * Initialize PRNG for TweetNaCl
   */
  private initializePRNG(): void {
    try {
      (nacl as any).setPRNG = (fn: (x: Uint8Array, n: number) => void) => {
        nacl.randomBytes = (n: number) => {
          const bytes = new Uint8Array(n);
          fn(bytes, n);
          return bytes;
        };
      };

      (nacl as any).setPRNG((x: Uint8Array, n: number) => {
        const randomBytes = Crypto.getRandomBytes(n);
        x.set(randomBytes);
      });

      this.isInitialized = true;
    } catch (error) {
      console.error("Error initializing PRNG:", error);

      try {
        if (typeof crypto !== "undefined" && crypto.getRandomValues) {
          (nacl as any).setPRNG((x: Uint8Array, n: number) => {
            crypto.getRandomValues(x);
          });
          this.isInitialized = true;
        } else {
          throw new Error("No secure random number generator available");
        }
      } catch (fallbackError) {
        console.error("Fallback PRNG initialization failed:", fallbackError);
      }
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      this.initializePRNG();
    }
    if (!this.isInitialized) {
      throw new Error(
        "CryptoService not properly initialized - no PRNG available"
      );
    }
  }

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

  /**
   * Generate and store key pair with cloud backup
   */
  async generateKeyPairWithCloudBackup(
    userId: string,
    password: string
  ): Promise<KeyPair> {
    this.ensureInitialized();

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

  /**
   * Initialize keys from cloud if not present locally
   */
  async initializeFromCloud(
    userId: string,
    password: string
  ): Promise<KeyPair | null> {
    try {
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

  /**
   * Clear local keys (useful for testing or logout)
   */
  async clearLocalKeys(userId: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(`privateKey_${userId}`);
    } catch (error) {
      console.error("Error clearing local keys:", error);
    }
  }

  /**
   * @deprecated Use generateKeyPairWithCloudBackup instead
   */
  async generateKeyPair(): Promise<KeyPair> {
    console.warn(
      "generateKeyPair is deprecated. Use generateKeyPairWithCloudBackup instead."
    );
    this.ensureInitialized();

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

  async storePrivateKey(privateKey: string, userId: string): Promise<void> {
    await SecureStore.setItemAsync(`privateKey_${userId}`, privateKey);
  }

  async getPrivateKey(userId: string): Promise<string | null> {
    return await SecureStore.getItemAsync(`privateKey_${userId}`);
  }

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
    this.ensureInitialized();

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

  async generateSymmetricKey(): Promise<Uint8Array> {
    return hybridCrypto.generateKey();
  }

  async generateNonce(): Promise<Uint8Array> {
    return hybridCrypto.generateNonce();
  }

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
    this.ensureInitialized();

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

  async encryptFile(
    data: Uint8Array,
    key: Uint8Array
  ): Promise<{
    encrypted: Uint8Array;
    nonce: Uint8Array;
  }> {
    try {
      const result = await hybridCrypto.encrypt(data, key);
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
    try {
      return await hybridCrypto.decrypt(encrypted, key, nonce);
    } catch (error) {
      console.error("Error decrypting file:", error);
      throw new Error(
        "Error al descifrar archivo: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  /**
   * FIXED: Ensure consistent key derivation for self-encryption
   */
  async encryptForSelf(
    plaintext: string,
    userPrivateKey: string
  ): Promise<string> {
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

      return JSON.stringify({
        ciphertext: encodeBase64(encrypted),
        nonce: encodeBase64(nonce),
        version: "nacl_secretbox_v1",
      });
    } catch (error) {
      console.error("Error en encryptForSelf:", error);
      throw new Error(
        "Error al cifrar datos personales: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  /**
   * Ensure consistent key derivation for self-decryption
   */
  async decryptForSelf(
    encryptedData: string,
    userPrivateKey: string
  ): Promise<string> {
    await hybridCrypto.initialize();
    console.log("🔐 decryptForSelf, encryptedData:", encryptedData);
    console.log("🔑 decryptForSelf, privateKey:", userPrivateKey);
    let parsed;
    try {
      parsed =
        typeof encryptedData === "string"
          ? JSON.parse(encryptedData)
          : encryptedData;
    } catch (e) {
      console.error("❌ parsing encryptedData fallido:", e);
      throw e;
    }
    const { ciphertext, nonce, version } = parsed;
    console.log(
      `ℹ️ versión ${version}, ciphertext length:`,
      ciphertext?.length,
      "nonce length:",
      nonce?.length
    );

    if (!ciphertext || !nonce) {
      throw new Error("Invalid encrypted data format");
    }

    // Use the same key derivation method as encryption
    const privateKeyBytes = decodeBase64(userPrivateKey);
    const derivedKey = nacl.hash(privateKeyBytes).slice(0, 32);

    const decrypted = await hybridCrypto.decrypt(
      decodeBase64(ciphertext),
      derivedKey,
      decodeBase64(nonce)
    );

    return encodeUTF8(decrypted);
  }
  catch(error: any) {
    console.error("Error en decryptForSelf:", error);
    throw new Error(
      "Error al descifrar datos personales: " +
        (error instanceof Error ? error.message : "Error desconocido")
    );
  }
}
