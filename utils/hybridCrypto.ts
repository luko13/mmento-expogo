// utils/hybridCrypto.ts
import nacl from "tweetnacl";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";

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

export class HybridCrypto {
  private implementation: CryptoImplementation | null = null;
  private sodium: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Try native crypto first (fastest)
      const nativeImpl = await this.tryNativeCrypto();
      if (nativeImpl) {
        this.implementation = nativeImpl;
        console.log("✅ Using native crypto implementation");
      } else {
        // Try libsodium-wrappers (WASM, faster than tweetnacl)
        const sodiumImpl = await this.tryLibsodium();
        if (sodiumImpl) {
          this.implementation = sodiumImpl;
          console.log("✅ Using libsodium WASM implementation");
        } else {
          // Fallback to tweetnacl
          this.implementation = this.getTweetNaclImplementation();
          console.log("✅ Using TweetNaCl implementation (fallback)");
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
      console.log("Native crypto not available:", error);
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
      console.log(
        "🔑 sodium.ready, ¿randombytes_buf?",
        typeof sodium.randombytes_buf
      );

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
      console.log("Libsodium no disponible o mal cargado:", error);
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

  // Public methods
  async encrypt(
    data: Uint8Array,
    key: Uint8Array,
    nonce?: Uint8Array
  ): Promise<{ encrypted: Uint8Array; nonce: Uint8Array }> {
    if (!this.implementation) await this.initialize();

    const actualNonce = nonce || (await this.implementation!.generateNonce());
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

    const decrypted = await this.implementation!.decrypt(data, key, nonce);
    if (!decrypted) throw new Error("Decryption failed");

    return decrypted;
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
        console.log("Argon2id not available, falling back to PBKDF2");
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
}

// Singleton instance
export const hybridCrypto = new HybridCrypto();
