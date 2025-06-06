// utils/hybridCrypto.ts
import nacl from "tweetnacl";
import { Buffer } from "buffer";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";
import { cryptoWorkerService } from "./cryptoWorkerService";
import { performanceOptimizer } from "./performanceOptimizer";

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

// SOLUCIÓN TEMPORAL: Agregar opciones para encrypt
interface EncryptOptions {
  forStorage?: boolean; // Si true, NO usa chunking (evita problema de 240 bytes)
}

export class HybridCrypto {
  private implementation: CryptoImplementation | null = null;
  private sodium: any = null;
  private isInitialized = false;

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
          keyHex: Buffer.from(key).toString("hex"),
          nonceHex: Buffer.from(nonce).toString("hex"),
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

  // Key derivation with best available method
  async deriveKey(
    password: string,
    salt: Uint8Array,
    iterations: number = 10000
  ): Promise<Uint8Array> {
    if (!this.implementation) await this.initialize();

    // Use Argon2id if available (libsodium)
    if (this.sodium?.crypto_pwhash) {
      try {
        return this.sodium.crypto_pwhash(
          32,
          password,
          salt,
          2, // opslimit
          67108864, // memlimit
          this.sodium.crypto_pwhash_ALG_ARGON2ID13
        );
      } catch (error) {
        console.log("Argon2id no disponible, usando fallback");
      }
    }

    // Fallback to simple key derivation
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    const combined = new Uint8Array(passwordBytes.length + salt.length);
    combined.set(passwordBytes);
    combined.set(salt, passwordBytes.length);

    // Simple PBKDF2-like implementation
    let key = new Uint8Array(combined);
    for (let i = 0; i < iterations; i++) {
      key = new Uint8Array(await crypto.subtle.digest("SHA-256", key));
    }

    return key.slice(0, 32);
  }

  /**
   * Obtener estadísticas de rendimiento
   */
  getPerformanceStats() {
    return {
      implementation: this.getImplementationName(),
      isNative: this.isUsingNativeCrypto(),
      threadedCryptoStats: cryptoWorkerService.getStats(),
      encryptMetrics: performanceOptimizer.getAverageMetrics("encrypt"),
      workerMetrics: performanceOptimizer.getAverageMetrics("worker-encrypt"),
    };
  }
}

// Singleton instance
export const hybridCrypto = new HybridCrypto();
