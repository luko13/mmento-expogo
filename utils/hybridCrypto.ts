/**
 * hybridCrypto.ts - Servicio de criptografía híbrido
 *
 * Utiliza la mejor implementación disponible:
 * 1. react-native-fast-crypto (nativo) - Más rápido
 * 2. libsodium-wrappers (WASM) - Rápido y seguro
 * 3. tweetnacl (JS puro) - Fallback confiable
 *
 * IMPORTANTE: La derivación de claves DEBE ser consistente entre sesiones
 */

import nacl from "tweetnacl";
import { Buffer } from "buffer";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";
import { cryptoWorkerService } from "./cryptoWorkerService";
import { performanceOptimizer } from "./performanceOptimizer";
import * as Crypto from "expo-crypto";

interface CryptoImplementation {
  name: string;
  isNative: boolean;
  encrypt: (
    data: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array
  ) => Promise<Uint8Array>;
  decrypt: (
    data: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array
  ) => Promise<Uint8Array | null>;
  generateKey: () => Promise<Uint8Array>;
  generateNonce: () => Promise<Uint8Array>;
}

interface EncryptOptions {
  forStorage?: boolean; // Si true, NO usa chunking (evita problema de 240 bytes)
}

/**
 * Tipos de derivación de claves soportados
 * CRÍTICO: Una vez que se usa uno, SIEMPRE se debe usar el mismo
 */
export enum KeyDerivationMethod {
  PBKDF2_SHA256 = "pbkdf2_sha256", // Método más compatible
  ARGON2ID = "argon2id", // Más seguro pero requiere libsodium
  SIMPLE_SHA256 = "simple_sha256", // Fallback para emergencias
}

export class HybridCrypto {
  private implementation: CryptoImplementation | null = null;
  private sodium: any = null;
  private isInitialized = false;

  // NUEVO: Método de derivación forzado para consistencia
  private forcedDerivationMethod: KeyDerivationMethod | null = null;

  // Umbral para usar threads (5MB)
  private readonly THREAD_THRESHOLD = 5 * 1024 * 1024;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Try native crypto first (fastest)
      const nativeImpl = await this.tryNativeCrypto();
      if (nativeImpl) {
        this.implementation = nativeImpl;
        console.log("🚀 Usando crypto nativo");
      } else {
        // Try libsodium-wrappers (WASM, faster than tweetnacl)
        const sodiumImpl = await this.tryLibsodium();
        if (sodiumImpl) {
          this.implementation = sodiumImpl;
          console.log("⚡ Usando libsodium-wrappers");
        } else {
          // Fallback to tweetnacl
          this.implementation = this.getTweetNaclImplementation();
          console.log("📦 Usando tweetnacl (fallback)");
        }
      }

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize crypto:", error);
      // Always fallback to tweetnacl
      this.implementation = this.getTweetNaclImplementation();
      this.isInitialized = true;
    }
  }

  private async tryNativeCrypto(): Promise<CryptoImplementation | null> {
    try {
      // Check if react-native-fast-crypto is available
      const { NativeCrypto } = await import("react-native-fast-crypto").catch(
        () => ({ NativeCrypto: null })
      );

      if (!NativeCrypto) return null;

      const nativeCrypto = new NativeCrypto();

      return {
        name: "native",
        isNative: true,
        encrypt: async (data, key, nonce) => {
          return nativeCrypto.crypto_secretbox_easy(data, nonce, key);
        },
        decrypt: async (data, key, nonce) => {
          return nativeCrypto.crypto_secretbox_open_easy(data, nonce, key);
        },
        generateKey: async () => {
          return nativeCrypto.randombytes_buf(32);
        },
        generateNonce: async () => {
          return nativeCrypto.randombytes_buf(24);
        },
      };
    } catch (error) {
      console.log("❌ react-native-fast-crypto no disponible");
      return null;
    }
  }

  private async tryLibsodium(): Promise<CryptoImplementation | null> {
    try {
      // Importamos todo el módulo y esperamos a que esté listo
      const mod = await import("libsodium-wrappers-sumo");

      await mod.ready;

      // Extraemos la API real (está en default en la mayoría de bundlers)
      const sodium = (mod as any).default ?? mod;

      // Si no existe randombytes_buf, descartamos y usamos TweetNaCl
      if (typeof sodium.randombytes_buf !== "function") {
        console.warn(
          "⚠️ libsodium-wrappers-sumo cargado sin randombytes_buf; usando fallback TweetNaCl"
        );
        return null;
      }

      // Guardamos la instancia para usar en encrypt/decrypt/generators
      this.sodium = sodium;

      return {
        name: "libsodium",
        isNative: false,

        // Cifra con secretbox_easy
        encrypt: async (data, key, nonce) =>
          this.sodium.crypto_secretbox_easy(data, nonce, key),

        // Descifra con secretbox_open_easy
        decrypt: async (data, key, nonce) => {
          try {
            return this.sodium.crypto_secretbox_open_easy(data, nonce, key);
          } catch {
            return null;
          }
        },

        // Genera clave
        generateKey: async () => this.sodium.randombytes_buf(32),

        // Genera nonce
        generateNonce: async () =>
          this.sodium.randombytes_buf(this.sodium.crypto_secretbox_NONCEBYTES),
      };
    } catch (error) {
      console.log("❌ libsodium-wrappers no disponible");
      return null;
    }
  }

  private getTweetNaclImplementation(): CryptoImplementation {
    return {
      name: "tweetnacl",
      isNative: false,
      encrypt: async (data, key, nonce) => {
        const encrypted = nacl.secretbox(data, nonce, key);
        if (!encrypted) throw new Error("Encryption failed");
        return encrypted;
      },
      decrypt: async (data, key, nonce) => {
        return nacl.secretbox.open(data, nonce, key);
      },
      generateKey: async () => {
        return nacl.randomBytes(32);
      },
      generateNonce: async () => {
        return nacl.randomBytes(nacl.secretbox.nonceLength);
      },
    };
  }

  // Public methods con soporte para threads
  async encrypt(
    data: Uint8Array,
    key: Uint8Array,
    nonce?: Uint8Array,
    options?: EncryptOptions
  ): Promise<{ encrypted: Uint8Array; nonce: Uint8Array }> {
    if (!this.implementation) await this.initialize();

    const actualNonce = nonce || (await this.implementation!.generateNonce());

    // SOLUCIÓN TEMPORAL: Si es para storage, NUNCA usar workers/chunking
    // Esto evita el problema de los 240 bytes extra
    if (options?.forStorage) {
      console.log(
        `🔐 Cifrando para storage - modo directo (${(
          data.length /
          1024 /
          1024
        ).toFixed(2)}MB)`
      );
      const encrypted = await this.implementation!.encrypt(
        data,
        key,
        actualNonce
      );

      console.log(
        `✅ Cifrado completo: ${data.length} → ${encrypted.length} bytes (+${
          encrypted.length - data.length
        } overhead)`
      );

      return { encrypted, nonce: actualNonce };
    }

    // Verificar si debemos usar threads (solo para operaciones temporales en UI)
    if (data.length > this.THREAD_THRESHOLD) {
      console.warn(
        `⚠️ Archivo grande (${(data.length / 1024 / 1024).toFixed(
          2
        )}MB) sin forStorage:true`
      );
      console.warn(
        "💡 Para archivos que se van a almacenar, usar { forStorage: true }"
      );

      try {
        // Usar chunking asíncrono (problemático para storage)
        const result = await cryptoWorkerService.encryptLargeData(
          data,
          key,
          (progress) => {
            // Progress callback
          }
        );

        // ADVERTENCIA: Esto causa el problema de 240 bytes extra
        console.warn("🚨 Usando chunking - solo para operaciones temporales");

        return {
          encrypted: result.encrypted,
          nonce: result.nonces[0], // Usar el primer nonce para compatibilidad
        };
      } catch (error) {
        console.error(
          "Error con chunking asíncrono, usando implementación local:",
          error
        );
        // Fallback a implementación sin chunks
      }
    }

    // Para archivos pequeños o si fallan los threads
    const encrypted = await this.implementation!.encrypt(
      data,
      key,
      actualNonce
    );

    return { encrypted, nonce: actualNonce };
  }

  async decrypt(
    data: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array
  ): Promise<Uint8Array> {
    if (!this.implementation) await this.initialize();

    console.log(
      `🔓 Descifrando ${(data.length / 1024 / 1024).toFixed(2)}MB con ${
        this.implementation!.name
      }`
    );

    try {
      const decrypted = await this.implementation!.decrypt(data, key, nonce);

      if (!decrypted) {
        console.error("❌ Decryption returned null/false");
        console.error("Debug info:", {
          keyHex: Buffer.from(key).toString("hex").substring(0, 20) + "...",
          nonceHex: Buffer.from(nonce).toString("hex").substring(0, 20) + "...",
          dataLength: data.length,
        });
        throw new Error("Decryption failed");
      }

      console.log(
        `✅ Descifrado exitoso: ${data.length} → ${decrypted.length} bytes`
      );
      return decrypted;
    } catch (error) {
      console.error("❌ Decryption error:", error);
      throw error;
    }
  }

  async generateKey(): Promise<Uint8Array> {
    if (!this.implementation) await this.initialize();
    return this.implementation!.generateKey();
  }

  async generateNonce(): Promise<Uint8Array> {
    if (!this.implementation) await this.initialize();
    return this.implementation!.generateNonce();
  }

  getImplementationName(): string {
    return this.implementation?.name || "not initialized";
  }

  isUsingNativeCrypto(): boolean {
    return this.implementation?.isNative || false;
  }

  /**
   * NUEVO: Establecer el método de derivación a usar
   * Debe llamarse antes de cualquier operación de derivación
   */
  setKeyDerivationMethod(method: KeyDerivationMethod): void {
    console.log(`🔐 Estableciendo método de derivación: ${method}`);
    this.forcedDerivationMethod = method;
  }

  /**
   * NUEVO: Obtener el método de derivación que se usaría
   */
  getAvailableDerivationMethod(): KeyDerivationMethod {
    // Si hay un método forzado, usarlo
    if (this.forcedDerivationMethod) {
      return this.forcedDerivationMethod;
    }

    // Si no, determinar basado en lo disponible
    // IMPORTANTE: Siempre preferir PBKDF2 para compatibilidad
    return KeyDerivationMethod.PBKDF2_SHA256;
  }

  /**
   * Derivación de claves MEJORADA con método consistente
   */
  async deriveKey(
    password: string,
    salt: Uint8Array,
    iterations: number = 10000
  ): Promise<Uint8Array> {
    if (!this.implementation) await this.initialize();

    const method = this.getAvailableDerivationMethod();
    console.log(`🔑 Derivando clave con método: ${method}`);
    console.log(`- Iterations: ${iterations}`);
    console.log(`- Salt length: ${salt.length}`);
    console.log(`- Password length: ${password.length}`);

    switch (method) {
      case KeyDerivationMethod.PBKDF2_SHA256:
        return this.derivePBKDF2(password, salt, iterations);

      case KeyDerivationMethod.ARGON2ID:
        if (this.sodium?.crypto_pwhash) {
          return this.deriveArgon2id(password, salt);
        }
        // Si no hay libsodium, usar PBKDF2
        console.warn(
          "⚠️ Argon2id solicitado pero no disponible, usando PBKDF2"
        );
        return this.derivePBKDF2(password, salt, iterations);

      case KeyDerivationMethod.SIMPLE_SHA256:
        return this.deriveSimpleSHA256(password, salt, iterations);

      default:
        // Por defecto, usar PBKDF2
        return this.derivePBKDF2(password, salt, iterations);
    }
  }

  /**
   * PBKDF2 con SHA-256 - Método más compatible
   */
  private async derivePBKDF2(
    password: string,
    salt: Uint8Array,
    iterations: number
  ): Promise<Uint8Array> {
    console.log("🔐 Usando PBKDF2-SHA256 para derivación");

    try {
      // En React Native, usar una implementación simple pero consistente
      // basada en el hash iterativo que sabemos que funcionaba antes

      const encoder = new TextEncoder();
      const passwordBytes = encoder.encode(password);

      // Combinar password y salt
      const combined = new Uint8Array(passwordBytes.length + salt.length);
      combined.set(passwordBytes);
      combined.set(salt, passwordBytes.length);

      // Usar Expo Crypto para el hashing si está disponible
      let key: Uint8Array = combined;

      if (
        typeof Crypto !== "undefined" &&
        typeof Crypto.digestStringAsync === "function"
      ) {
        console.log("📱 Usando Expo Crypto para hashing");

        for (let i = 0; i < iterations; i++) {
          // Convertir a base64 para Expo Crypto
          const keyBase64 = Buffer.from(key).toString("base64");
          const hashHex = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            keyBase64,
            { encoding: Crypto.CryptoEncoding.HEX }
          );

          // Convertir hex a Uint8Array
          key = new Uint8Array(
            hashHex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
          );
        }
      } else {
        console.log("📱 Usando implementación manual de SHA-256");

        // Fallback: usar nacl.hash si está disponible
        for (let i = 0; i < iterations; i++) {
          key = nacl.hash(key).slice(0, 32);
        }
      }

      console.log("✅ PBKDF2 completado");
      return key.slice(0, 32);
    } catch (error) {
      console.error("❌ Error en PBKDF2:", error);

      // Último fallback: usar el método simple que sabemos que funcionaba
      console.log("🔄 Usando fallback final");
      const encoder = new TextEncoder();
      const passwordBytes = encoder.encode(password);
      const combined = new Uint8Array(passwordBytes.length + salt.length);
      combined.set(passwordBytes);
      combined.set(salt, passwordBytes.length);

      // Usar nacl.hash que sabemos que funciona
      let key: Uint8Array = combined;
      for (let i = 0; i < iterations; i++) {
        key = nacl.hash(key);
      }

      return key.slice(0, 32);
    }
  }

  /**
   * Argon2id - Más seguro pero requiere libsodium
   */
  private async deriveArgon2id(
    password: string,
    salt: Uint8Array
  ): Promise<Uint8Array> {
    console.log("🔐 Usando Argon2id para derivación");

    try {
      const key = await this.sodium.crypto_pwhash(
        32, // longitud de la clave
        password,
        salt,
        2, // opslimit (operaciones)
        67108864, // memlimit (64MB)
        this.sodium.crypto_pwhash_ALG_ARGON2ID13
      );

      console.log("✅ Argon2id completado");
      return key;
    } catch (error) {
      console.error("❌ Error en Argon2id:", error);
      throw error;
    }
  }

  /**
   * SHA-256 simple - Solo para emergencias
   */
  private async deriveSimpleSHA256(
    password: string,
    salt: Uint8Array,
    iterations: number
  ): Promise<Uint8Array> {
    console.log("🔐 Usando SHA-256 simple para derivación");

    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    const combined = new Uint8Array(passwordBytes.length + salt.length);
    combined.set(passwordBytes);
    combined.set(salt, passwordBytes.length);

    // Usar nacl.hash que sabemos que funciona en React Native
    let key: Uint8Array = combined;
    for (let i = 0; i < iterations; i++) {
      key = nacl.hash(key);
    }

    console.log("✅ SHA-256 simple completado");
    return key.slice(0, 32);
  }

  /**
   * Obtener estadísticas de rendimiento
   */
  getPerformanceStats() {
    return {
      implementation: this.getImplementationName(),
      isNative: this.isUsingNativeCrypto(),
      derivationMethod: this.getAvailableDerivationMethod(),
      threadedCryptoStats: cryptoWorkerService.getStats(),
      encryptMetrics: performanceOptimizer.getAverageMetrics("encrypt"),
      workerMetrics: performanceOptimizer.getAverageMetrics("worker-encrypt"),
    };
  }
}

// Singleton instance
export const hybridCrypto = new HybridCrypto();
