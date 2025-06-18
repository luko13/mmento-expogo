/**
 * keyMigration.ts - Utilidades para migrar claves existentes
 *
 * Este archivo ayuda a migrar usuarios que tienen claves cifradas
 * con métodos de derivación antiguos o desconocidos
 */

import { supabase } from "../lib/supabase";
import { CryptoService } from "./cryptoService";
import { hybridCrypto, KeyDerivationMethod } from "./hybridCrypto";

/**
 * Intenta recuperar las claves con diferentes métodos de derivación
 * hasta encontrar el correcto
 */
export async function tryRecoverKeysWithMultipleMethods(
  userId: string,
  password: string
): Promise<boolean> {
  console.log("🔄 Intentando recuperar claves con múltiples métodos...");

  const cryptoService = CryptoService.getInstance();

  // Obtener datos cifrados de la nube
  const { data, error } = await supabase
    .from("profiles")
    .select("encrypted_private_key, private_key_salt, private_key_nonce")
    .eq("id", userId)
    .single();

  if (error || !data?.encrypted_private_key) {
    console.error("❌ No se encontraron claves cifradas");
    return false;
  }

  // Métodos a probar en orden
  const methodsToTry = [
    KeyDerivationMethod.PBKDF2_SHA256, // Más probable
    KeyDerivationMethod.SIMPLE_SHA256, // Fallback antiguo
    KeyDerivationMethod.ARGON2ID, // Si tenía libsodium
  ];

  for (const method of methodsToTry) {
    console.log(`🔑 Probando con método: ${method}`);

    try {
      // Configurar el método
      hybridCrypto.setKeyDerivationMethod(method);

      // Intentar descifrar
      const privateKey = await cryptoService.decryptPrivateKeyFromCloud(
        {
          encryptedKey: data.encrypted_private_key,
          salt: data.private_key_salt,
          nonce: data.private_key_nonce,
          derivationMethod: method,
        },
        password
      );

      if (privateKey) {
        console.log(`✅ Claves recuperadas exitosamente con método: ${method}`);

        // Actualizar en la BD para futuras recuperaciones
        await updateDerivationMethod(userId, method);

        // Guardar localmente
        await cryptoService.storePrivateKey(privateKey, userId);

        return true;
      }
    } catch (error) {
      console.log(`❌ Falló con ${method}:`, error);
      // Continuar con el siguiente método
    }
  }

  console.error("❌ No se pudieron recuperar las claves con ningún método");
  return false;
}

/**
 * Actualiza el método de derivación en la base de datos
 */
async function updateDerivationMethod(
  userId: string,
  method: KeyDerivationMethod
): Promise<void> {
  try {
    // Agregar el método de derivación a los metadatos
    const { error } = await supabase
      .from("profiles")
      .update({
        key_derivation_method: method,
      })
      .eq("id", userId);

    if (error) {
      console.error("Error actualizando método de derivación:", error);
    } else {
      console.log("✅ Método de derivación actualizado en la BD");
    }
  } catch (error) {
    console.error("Error actualizando método:", error);
  }
}

/**
 * Re-cifra las claves con el método estándar PBKDF2
 */
export async function reEncryptKeysWithStandardMethod(
  userId: string,
  password: string
): Promise<boolean> {
  console.log("🔄 Re-cifrando claves con método estándar...");

  const cryptoService = CryptoService.getInstance();

  try {
    // Obtener clave privada actual (debe estar en almacenamiento local)
    const privateKey = await cryptoService.getPrivateKey(userId);
    if (!privateKey) {
      console.error("❌ No hay clave privada local para re-cifrar");
      return false;
    }

    // Obtener clave pública
    const { data: profile } = await supabase
      .from("profiles")
      .select("public_key")
      .eq("id", userId)
      .single();

    if (!profile?.public_key) {
      console.error("❌ No se encontró clave pública");
      return false;
    }

    // Re-cifrar con método estándar
    await cryptoService.storePrivateKeyInCloud(privateKey, userId, password);

    console.log("✅ Claves re-cifradas con método estándar");
    return true;
  } catch (error) {
    console.error("❌ Error re-cifrando claves:", error);
    return false;
  }
}

/**
 * Diagnóstico completo del estado de cifrado del usuario
 */
export async function diagnoseCryptoState(userId: string): Promise<{
  hasPublicKey: boolean;
  hasEncryptedPrivateKey: boolean;
  hasLocalPrivateKey: boolean;
  derivationMethod?: string;
  needsMigration: boolean;
}> {
  const cryptoService = CryptoService.getInstance();

  // Verificar BD
  const { data: profile } = await supabase
    .from("profiles")
    .select("public_key, encrypted_private_key, key_derivation_method")
    .eq("id", userId)
    .single();

  // Verificar almacenamiento local
  const localPrivateKey = await cryptoService.getPrivateKey(userId);

  const result = {
    hasPublicKey: !!profile?.public_key,
    hasEncryptedPrivateKey: !!profile?.encrypted_private_key,
    hasLocalPrivateKey: !!localPrivateKey,
    derivationMethod: profile?.key_derivation_method,
    needsMigration: false,
  };

  // Determinar si necesita migración
  result.needsMigration =
    result.hasEncryptedPrivateKey &&
    !result.derivationMethod &&
    !result.hasLocalPrivateKey;

  return result;
}
