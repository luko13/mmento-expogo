// utils/cryptoService.ts
import { Buffer } from "buffer";
import "react-native-get-random-values"; // CRÍTICO: Debe estar antes de tweetnacl
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
import { hybridCrypto, KeyDerivationMethod } from "./hybridCrypto";

// Polyfill para Buffer en React Native
if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}

/**
 * Interface para datos cifrados
 */
export interface EncryptedData {
  ciphertext: string; // Texto cifrado en base64
  nonce: string; // Nonce usado para el cifrado en base64
  senderPublicKey?: string; // Clave pública del emisor (opcional)
}

/**
 * Interface para un par de claves
 */
export interface KeyPair {
  publicKey: string; // Clave pública en base64
  privateKey: string; // Clave privada en base64
}

/**
 * Servicio principal de criptografía
 * Implementa el patrón Singleton para garantizar una única instancia
 */
export class CryptoService {
  private static instance: CryptoService;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Constructor privado para implementar el patrón Singleton
   */
  private constructor() {
    // La inicialización se hace bajo demanda para evitar problemas de orden de carga
  }

  /**
   * Obtiene la instancia única del servicio
   */
  static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  /**
   * Inicializa el servicio de criptografía
   * Se asegura de que solo se inicialice una vez
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Si ya está inicializando, esperar a que termine
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitialize();
    await this.initializationPromise;
  }

  /**
   * Realiza la inicialización real del servicio
   */
  private async doInitialize(): Promise<void> {
    try {
      console.log("🔐 Inicializando CryptoService...");

      // 1. Inicializar el generador de números aleatorios
      await this.initializePRNG();

      // 2. Inicializar el servicio de cifrado híbrido
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
        console.error(
          "❌ Fallback initialization también falló:",
          fallbackError
        );
        throw new Error("No se pudo inicializar el servicio de criptografía");
      }
    }
  }

  /**
   * Inicializa el generador de números aleatorios pseudoaleatorios (PRNG)
   * Crítico para la seguridad - sin un buen PRNG, toda la criptografía es insegura
   */
  private async initializePRNG(): Promise<void> {
    console.log("🎲 Inicializando PRNG...");

    try {
      // Primero verificar si ya está configurado (por globalInit.ts)
      if (typeof nacl.randomBytes === "function") {
        try {
          const test = nacl.randomBytes(16);
          if (test && test.length === 16 && !test.every((b) => b === 0)) {
            console.log("✅ PRNG ya estaba configurado correctamente");
            return;
          }
        } catch (e) {
          console.warn("⚠️ nacl.randomBytes existe pero falla:", e);
        }
      }

      // Método 1: Expo Crypto (preferido en React Native)
      if (typeof Crypto !== "undefined" && Crypto.getRandomBytes) {
        const testBytes = Crypto.getRandomBytes(16);
        if (testBytes && testBytes.length === 16) {
          // Configurar randomBytes directamente
          nacl.randomBytes = (n: number) => {
            return Crypto.getRandomBytes(n);
          };

          // Configurar setPRNG si existe (para compatibilidad)
          if ((nacl as any).setPRNG) {
            (nacl as any).setPRNG((x: Uint8Array, n: number) => {
              const randomBytes = Crypto.getRandomBytes(n);
              x.set(randomBytes);
            });
          }

          console.log("✅ PRNG inicializado con Expo.Crypto");
          return;
        }
      }
    } catch (error) {
      console.warn("⚠️ Expo.Crypto no disponible:", error);
    }

    try {
      // Método 2: Web Crypto API (navegadores y algunos entornos RN)
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        nacl.randomBytes = (n: number) => {
          const bytes = new Uint8Array(n);
          crypto.getRandomValues(bytes);
          return bytes;
        };

        if ((nacl as any).setPRNG) {
          (nacl as any).setPRNG((x: Uint8Array, n: number) => {
            crypto.getRandomValues(x);
          });
        }

        console.log("✅ PRNG inicializado con Web Crypto API");
        return;
      }
    } catch (error) {
      console.warn("⚠️ Web Crypto API no disponible:", error);
    }

    try {
      // Método 3: react-native-get-random-values (polyfill)
      if (typeof global !== "undefined" && global.crypto?.getRandomValues) {
        nacl.randomBytes = (n: number) => {
          const bytes = new Uint8Array(n);
          global.crypto.getRandomValues(bytes);
          return bytes;
        };

        if ((nacl as any).setPRNG) {
          (nacl as any).setPRNG((x: Uint8Array, n: number) => {
            global.crypto.getRandomValues(x);
          });
        }

        console.log("✅ PRNG inicializado con react-native-get-random-values");
        return;
      }
    } catch (error) {
      console.warn("⚠️ react-native-get-random-values no disponible:", error);
    }

    // Si llegamos aquí, no hay PRNG seguro disponible
    throw new Error("No se pudo inicializar un PRNG seguro");
  }

  /**
   * Inicialización básica sin el servicio híbrido
   * Se usa como fallback si la inicialización completa falla
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
   * Asegura que el servicio esté inicializado antes de usarlo
   * Todos los métodos públicos deben llamar a esto primero
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
   * Prueba el servicio de criptografía para verificar que funciona correctamente
   * Se usa durante la inicialización de la app para detectar problemas temprano
   */
  async testCryptoService(): Promise<boolean> {
    try {
      await this.ensureInitialized();

      // Test 1: Verificar que nacl está configurado
      if (typeof nacl.randomBytes !== "function") {
        console.error("❌ nacl.randomBytes no es una función");
        return false;
      }

      // Test 2: Intentar generar bytes aleatorios
      let testBytes;
      try {
        testBytes = nacl.randomBytes(32);
      } catch (error) {
        console.error("❌ nacl.randomBytes falló:", error);
        return false;
      }

      if (!testBytes || testBytes.length !== 32) {
        console.error("❌ La generación aleatoria devolvió datos inválidos");
        return false;
      }

      // Test 3: Verificar que no todos los bytes son cero (mal PRNG)
      if (testBytes.every((byte) => byte === 0)) {
        console.error("❌ Los bytes aleatorios son todos ceros");
        return false;
      }

      // Test 4: Probar generación de claves
      try {
        const keyPair = nacl.box.keyPair();
        if (!keyPair.publicKey || !keyPair.secretKey) {
          console.error("❌ La generación de claves devolvió claves inválidas");
          return false;
        }
      } catch (error) {
        console.error("❌ La generación de claves falló:", error);
        return false;
      }

      console.log("✅ CryptoService test pasado");
      return true;
    } catch (error) {
      console.error("❌ CryptoService test falló:", error);
      return false;
    }
  }

  /**
   * Genera un par de claves y hace respaldo en la nube
   * Este es el método principal para crear claves nuevas
   *
   * @param userId - ID del usuario
   * @param password - Contraseña para cifrar la clave privada en la nube
   * @returns Par de claves generado
   */
  async generateKeyPairWithCloudBackup(
    userId: string,
    password: string
  ): Promise<KeyPair> {
    await this.ensureInitialized();

    // Generar nuevo par de claves
    const keyPair = nacl.box.keyPair();
    const result = {
      publicKey: encodeBase64(keyPair.publicKey),
      privateKey: encodeBase64(keyPair.secretKey),
    };

    // Guardar localmente en almacenamiento seguro
    await this.storePrivateKey(result.privateKey, userId);

    // Hacer respaldo cifrado en la nube
    await this.storePrivateKeyInCloud(result.privateKey, userId, password);

    // Actualizar clave pública en el perfil del usuario
    const { error } = await supabase
      .from("profiles")
      .update({ public_key: result.publicKey })
      .eq("id", userId);

    if (error) {
      console.error("Error actualizando clave pública:", error);
      // No fallar si no se puede actualizar el perfil
    }

    return result;
  }

  /**
   * Inicializa el servicio desde claves respaldadas en la nube
   * Se usa cuando un usuario hace login en un nuevo dispositivo
   *
   * @param userId - ID del usuario
   * @param password - Contraseña para descifrar la clave privada
   * @returns Par de claves recuperado o null si falla
   */
  async initializeFromCloud(
    userId: string,
    password: string
  ): Promise<KeyPair | null> {
    try {
      await this.ensureInitialized();

      // Buscar el respaldo en la nube
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "public_key, encrypted_private_key, private_key_salt, private_key_nonce"
        )
        .eq("id", userId)
        .single();

      if (!profile?.encrypted_private_key || !profile?.public_key) {
        console.log("No se encontró respaldo de claves en la nube");
        return null;
      }

      // Recuperar y descifrar la clave privada
      const cloudPrivateKey = await this.retrievePrivateKeyFromCloud(
        userId,
        password
      );

      if (!cloudPrivateKey) {
        console.error("No se pudo recuperar la clave privada de la nube");
        return null;
      }

      // Crear el par de claves
      const keyPair = {
        publicKey: profile.public_key,
        privateKey: cloudPrivateKey,
      };

      // Validar el par de claves con una prueba de cifrado/descifrado
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
          throw new Error("La validación del par de claves falló");
        }
      } catch (error) {
        console.error("La validación del par de claves falló:", error);
        return null;
      }

      // Guardar localmente para uso futuro
      await this.storePrivateKey(cloudPrivateKey, userId);
      return keyPair;
    } catch (error) {
      console.error("Error en initializeFromCloud:", error);
      return null;
    }
  }

  /**
   * Deriva una clave de cifrado desde una contraseña
   * Usa la misma implementación que hybridCrypto para compatibilidad
   *
   * @param password - Contraseña del usuario
   * @param salt - Salt para la derivación
   * @param method - Método de derivación a usar
   * @returns Clave derivada
   */
  private async deriveKeyFromPassword(
    password: string,
    salt: Uint8Array,
    method: KeyDerivationMethod = KeyDerivationMethod.PBKDF2_SHA256
  ): Promise<Uint8Array> {
    console.log("🔑 Derivando clave desde contraseña...");
    console.log("- Password length:", password.length);
    console.log("- Salt length:", salt.length);
    console.log("- Method:", method);
    console.log(
      "- Salt (hex):",
      Buffer.from(salt).toString("hex").substring(0, 20) + "..."
    );

    const startTime = Date.now();
    let derivedKey: Uint8Array;

    switch (method) {
      case KeyDerivationMethod.PBKDF2_SHA256:
        const iterations = 10000;
        console.log("🔐 Usando PBKDF2-SHA256 con", iterations, "iteraciones");

        try {
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
            console.log("📱 Usando nacl.hash fallback");

            // Fallback: usar nacl.hash si está disponible
            for (let i = 0; i < iterations; i++) {
              key = nacl.hash(key).slice(0, 32);
            }
          }

          derivedKey = key.slice(0, 32);
        } catch (error) {
          console.error("❌ Error en PBKDF2:", error);
          throw error;
        }
        break;

      case KeyDerivationMethod.SIMPLE_SHA256:
        // Simple SHA256 del password + salt
        console.log("🔐 Usando SHA256 simple");
        const encoder = new TextEncoder();
        const passwordBytes = encoder.encode(password);
        const combined = new Uint8Array(passwordBytes.length + salt.length);
        combined.set(passwordBytes);
        combined.set(salt, passwordBytes.length);

        const hash = nacl.hash(combined);
        derivedKey = hash.slice(0, 32);
        break;

      case KeyDerivationMethod.ARGON2ID:
        // Argon2 no está disponible en React Native, usar PBKDF2 como fallback
        console.log("⚠️ Argon2 no disponible, usando PBKDF2 como fallback");
        return this.deriveKeyFromPassword(
          password,
          salt,
          KeyDerivationMethod.PBKDF2_SHA256
        );

      default:
        throw new Error(`Método de derivación no soportado: ${method}`);
    }

    const duration = Date.now() - startTime;
    if (duration > 3000) {
      console.warn(
        `⚠️ Key derivation slow (${duration}ms), consider reducing iterations`
      );
    }

    console.log("- Derived key length:", derivedKey.length);
    console.log(
      "- Derived key (hex):",
      Buffer.from(derivedKey).toString("hex").substring(0, 20) + "..."
    );

    return derivedKey;
  }

  /**
   * Cifra la clave privada para almacenamiento en la nube
   *
   * @param privateKey - Clave privada en base64
   * @param password - Contraseña del usuario
   * @returns Datos cifrados con salt y nonce
   */
  async encryptPrivateKeyForCloud(
    privateKey: string,
    password: string
  ): Promise<{
    encryptedKey: string;
    salt: string;
    nonce: string;
    derivationMethod?: string;
  }> {
    await this.ensureInitialized();

    // IMPORTANTE: Forzar PBKDF2 para compatibilidad máxima
    const method = KeyDerivationMethod.PBKDF2_SHA256;

    // Generar salt aleatorio
    const salt = nacl.randomBytes(16);

    // Derivar clave desde la contraseña
    const derivedKey = await this.deriveKeyFromPassword(password, salt, method);

    // Cifrar la clave privada usando nacl.secretbox
    const privateKeyBytes = decodeBase64(privateKey);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const encrypted = nacl.secretbox(privateKeyBytes, nonce, derivedKey);

    return {
      encryptedKey: encodeBase64(encrypted),
      salt: encodeBase64(salt),
      nonce: encodeBase64(nonce),
      derivationMethod: method,
    };
  }

  /**
   * Descifra la clave privada desde el almacenamiento en la nube
   *
   * @param encryptedData - Datos cifrados con salt y nonce
   * @param password - Contraseña del usuario
   * @returns Clave privada descifrada en base64
   */
  async decryptPrivateKeyFromCloud(
    encryptedData: {
      encryptedKey: string;
      salt: string;
      nonce: string;
      derivationMethod?: string;
    },
    password: string
  ): Promise<string> {
    await this.ensureInitialized();

    // Si falla, intentar con el método original
    throw new Error("No se pudo recuperar la clave con ningún método");
  }

  /**
   * Almacena la clave privada cifrada en la nube
   *
   * @param privateKey - Clave privada en base64
   * @param userId - ID del usuario
   * @param password - Contraseña para cifrar
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
      throw new Error(`Error almacenando clave cifrada: ${error.message}`);
    }
  }

  /**
   * Recupera y descifra la clave privada desde la nube
   *
   * @param userId - ID del usuario
   * @param password - Contraseña para descifrar
   * @returns Clave privada o null si falla
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
      console.error("Error descifrando clave privada:", error);
      return null;
    }
  }

  /**
   * Almacena la clave privada localmente de forma segura
   *
   * @param privateKey - Clave privada en base64
   * @param userId - ID del usuario
   */
  async storePrivateKey(privateKey: string, userId: string): Promise<void> {
    await SecureStore.setItemAsync(`privateKey_${userId}`, privateKey);
  }

  /**
   * Obtiene la clave privada del almacenamiento local
   *
   * @param userId - ID del usuario
   * @returns Clave privada o null si no existe
   */
  async getPrivateKey(userId: string): Promise<string | null> {
    return await SecureStore.getItemAsync(`privateKey_${userId}`);
  }

  /**
   * Elimina las claves locales (para logout)
   *
   * @param userId - ID del usuario
   */
  async clearLocalKeys(userId: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(`privateKey_${userId}`);
    } catch (error) {
      console.error("Error eliminando claves locales:", error);
    }
  }

  /**
   * Cifra datos para el propio usuario (cifrado simétrico)
   * Se usa para proteger datos personales que solo el usuario debe ver
   *
   * @param plaintext - Texto a cifrar
   * @param userPrivateKey - Clave privada del usuario
   * @returns Datos cifrados en formato JSON
   */
  async encryptForSelf(
    plaintext: string,
    userPrivateKey: string
  ): Promise<string> {
    await this.ensureInitialized();

    try {
      // Derivar una clave simétrica desde la clave privada
      const privateKeyBytes = decodeBase64(userPrivateKey);
      const derivedKey = nacl.hash(privateKeyBytes).slice(0, 32);

      // Cifrar el mensaje
      const message = decodeUTF8(plaintext);
      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
      const encrypted = nacl.secretbox(message, nonce, derivedKey);

      // Empaquetar el resultado
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

  /**
   * Descifra datos del propio usuario
   *
   * @param encryptedData - Datos cifrados (string JSON o objeto)
   * @param userPrivateKey - Clave privada del usuario
   * @returns Texto descifrado
   */
  async decryptForSelf(
    encryptedData: string | any,
    userPrivateKey: string
  ): Promise<string> {
    await this.ensureInitialized();

    // Parsear datos si es necesario
    const parsed =
      typeof encryptedData === "string"
        ? JSON.parse(encryptedData)
        : encryptedData;

    const { ciphertext, nonce, version } = parsed;

    if (!ciphertext || !nonce) {
      throw new Error("Formato de datos cifrados inválido");
    }

    try {
      // Usar la misma derivación de clave que en el cifrado
      const privateKeyBytes = decodeBase64(userPrivateKey);
      const derivedKey = nacl.hash(privateKeyBytes).slice(0, 32);

      // Descifrar
      const decrypted = nacl.secretbox.open(
        decodeBase64(ciphertext),
        decodeBase64(nonce),
        derivedKey
      );

      if (!decrypted) {
        throw new Error("Descifrado falló - clave incorrecta");
      }

      return encodeUTF8(decrypted);
    } catch (error: any) {
      console.error("Error en decryptForSelf:", error);
      throw new Error(
        "Error al descifrar datos personales: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  /**
   * Cifra texto para otro usuario (cifrado asimétrico)
   *
   * @param plaintext - Texto a cifrar
   * @param recipientPublicKey - Clave pública del destinatario
   * @param senderPrivateKey - Clave privada del remitente
   * @returns Datos cifrados
   */
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

      // Cifrar usando box (cifrado autenticado)
      const encrypted = nacl.box(message, nonce, publicKey, privateKey);

      if (!encrypted) {
        throw new Error("El cifrado falló");
      }

      return {
        ciphertext: encodeBase64(encrypted),
        nonce: encodeBase64(nonce),
      };
    } catch (error) {
      console.error("Error cifrando texto:", error);
      throw new Error(
        "Error al cifrar texto: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  /**
   * Descifra texto de otro usuario
   *
   * @param encryptedData - Datos cifrados
   * @param senderPublicKey - Clave pública del remitente
   * @param recipientPrivateKey - Clave privada del destinatario
   * @returns Texto descifrado
   */
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

      // Descifrar y verificar autenticidad
      const decrypted = nacl.box.open(ciphertext, nonce, publicKey, privateKey);

      if (!decrypted) {
        throw new Error("Descifrado falló - datos o claves inválidas");
      }

      return encodeUTF8(decrypted);
    } catch (error) {
      console.error("Error descifrando texto:", error);
      throw new Error(
        "Error al descifrar texto: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  /**
   * Genera una clave simétrica para cifrado de archivos
   *
   * @returns Clave simétrica de 32 bytes
   */
  async generateSymmetricKey(): Promise<Uint8Array> {
    await this.ensureInitialized();
    return nacl.randomBytes(32);
  }

  /**
   * Genera un nonce aleatorio
   *
   * @returns Nonce de 24 bytes
   */
  async generateNonce(): Promise<Uint8Array> {
    await this.ensureInitialized();
    return nacl.randomBytes(nacl.secretbox.nonceLength);
  }

  /**
   * Cifra una clave simétrica para compartirla con otro usuario
   *
   * @param symmetricKey - Clave simétrica a cifrar
   * @param recipientPublicKey - Clave pública del destinatario
   * @param senderPrivateKey - Clave privada del remitente
   * @returns Clave cifrada
   */
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
        throw new Error("El cifrado de la clave simétrica falló");
      }

      return {
        ciphertext: encodeBase64(encrypted),
        nonce: encodeBase64(nonce),
      };
    } catch (error) {
      console.error("Error cifrando clave simétrica:", error);
      throw new Error(
        "Error al cifrar clave simétrica: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  /**
   * Descifra una clave simétrica compartida
   *
   * @param encryptedKey - Clave cifrada
   * @param senderPublicKey - Clave pública del remitente
   * @param recipientPrivateKey - Clave privada del destinatario
   * @returns Clave simétrica descifrada
   */
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
        throw new Error("El descifrado de la clave simétrica falló");
      }
      return decrypted;
    } catch (error) {
      console.error("Error descifrando clave simétrica:", error);
      throw new Error(
        "Error al descifrar clave simétrica: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  /**
   * Cifra un archivo usando cifrado simétrico
   *
   * @param data - Datos del archivo como Uint8Array
   * @param key - Clave simétrica
   * @returns Archivo cifrado y nonce
   */
  async encryptFile(
    data: Uint8Array,
    key: Uint8Array
  ): Promise<{
    encrypted: Uint8Array;
    nonce: Uint8Array;
  }> {
    await this.ensureInitialized();

    console.log("🔐 encryptFile:");
    console.log("- Tamaño de entrada:", data.length);

    try {
      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
      const encrypted = nacl.secretbox(data, nonce, key);

      console.log("- Tamaño de salida:", encrypted.length);
      console.log("- Overhead:", encrypted.length - data.length);
      console.log("- Tamaño del nonce:", nonce.length);

      return { encrypted, nonce };
    } catch (error) {
      console.error("Error cifrando archivo:", error);
      throw new Error(
        "Error al cifrar archivo: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  /**
   * Descifra un archivo
   *
   * @param encrypted - Datos cifrados
   * @param nonce - Nonce usado en el cifrado
   * @param key - Clave simétrica
   * @returns Datos descifrados
   */
  async decryptFile(
    encrypted: Uint8Array,
    nonce: Uint8Array,
    key: Uint8Array
  ): Promise<Uint8Array> {
    await this.ensureInitialized();

    try {
      const decrypted = nacl.secretbox.open(encrypted, nonce, key);

      if (!decrypted) {
        throw new Error("Descifrado falló - clave incorrecta");
      }

      return decrypted;
    } catch (error) {
      console.error("❌ decryptFile falló:", error);
      console.error("Nonce como hex:", Buffer.from(nonce).toString("hex"));
      console.error("Key como hex:", Buffer.from(key).toString("hex"));
      throw new Error(
        "Error al descifrar archivo: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }

  /**
   * Genera un par de claves básico (método deprecado)
   * @deprecated Usar generateKeyPairWithCloudBackup en su lugar
   */
  async generateKeyPair(): Promise<KeyPair> {
    console.warn(
      "generateKeyPair está deprecado. Usa generateKeyPairWithCloudBackup en su lugar."
    );
    await this.ensureInitialized();

    try {
      const keyPair = nacl.box.keyPair();
      return {
        publicKey: encodeBase64(keyPair.publicKey),
        privateKey: encodeBase64(keyPair.secretKey),
      };
    } catch (error) {
      console.error("Error generando par de claves:", error);
      throw new Error(
        "Error al generar par de claves: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    }
  }
}

// Exportar la instancia singleton
export const cryptoService = CryptoService.getInstance();
