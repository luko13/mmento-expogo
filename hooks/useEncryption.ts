// hooks/useEncryption.ts
import { useState, useEffect, useCallback } from "react";
import { CryptoService, type KeyPair } from "../utils/cryptoService";
import { supabase } from "../lib/supabase";
import { keyCache } from "../utils/smartKeyCache";

export interface UseEncryptionReturn {
  isReady: boolean;
  keyPair: KeyPair | null;
  publicKeys: Map<string, string>;
  generateKeys: (password: string) => Promise<void>;
  getPublicKey: (userId: string) => Promise<string | null>;
  encryptText: (text: string, recipientUserId: string) => Promise<string>;
  decryptText: (encryptedData: string, senderUserId: string) => Promise<string>;
  encryptForSelf: (text: string) => Promise<string>;
  decryptForSelf: (encryptedData: string) => Promise<string>;
  refreshKeys: (password: string) => Promise<void>;
  hasDecryptionErrors: boolean;
  error: string | null;
  debugKeys: () => Promise<void>;
}

export const useEncryption = (): UseEncryptionReturn => {
  const [isReady, setIsReady] = useState(false);
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [publicKeys, setPublicKeys] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasDecryptionErrors, setHasDecryptionErrors] = useState(false);

  const cryptoService = CryptoService.getInstance();

  // Initialize from existing keys on component mount
  useEffect(() => {
    let mounted = true;

    const checkAuthAndInitialize = async () => {
      try {
        // Warm up cache on app start
        await keyCache.warmUp();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) {
            setIsReady(false);
            setError(null);
          }
          return;
        }

        if (mounted) {
          setCurrentUserId(user.id);
          await loadExistingKeys(user.id);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error desconocido");
        }
      }
    };

    checkAuthAndInitialize();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        setCurrentUserId(session.user.id);
        await loadExistingKeys(session.user.id);
      } else if (event === "SIGNED_OUT") {
        // Clear crypto state on logout
        setKeyPair(null);
        setPublicKeys(new Map());
        setIsReady(false);
        setCurrentUserId(null);
        setError(null);
        setHasDecryptionErrors(false);
        // Clear key cache on logout
        await keyCache.clear();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadExistingKeys = async (userId: string) => {
    try {
      setError(null);

      // Try to load existing private key
      const existingPrivateKey = await cryptoService.getPrivateKey(userId);

      if (existingPrivateKey) {
        // Get public key from server
        const { data: profile } = await supabase
          .from("profiles")
          .select("public_key")
          .eq("id", userId)
          .single();

        if (profile?.public_key) {
          setKeyPair({
            publicKey: profile.public_key,
            privateKey: existingPrivateKey,
          });
        }
      }

      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const generateKeys = async (password: string) => {
    try {
      if (!currentUserId) {
        throw new Error("Usuario no autenticado");
      }

      // Log cache stats before generation

      // Always generate with cloud backup
      const newKeyPair = await cryptoService.generateKeyPairWithCloudBackup(
        currentUserId,
        password
      );

      setKeyPair(newKeyPair);
      setIsReady(true);
      setHasDecryptionErrors(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando claves");
      throw err;
    }
  };

  const refreshKeys = async (password: string) => {
    try {
      if (!currentUserId) {
        throw new Error("Usuario no autenticado");
      }

      // Clear current keys
      setKeyPair(null);
      setIsReady(false);
      setHasDecryptionErrors(false);

      // Clear key cache
      await keyCache.clear();

      // Regenerate keys
      const newKeyPair = await cryptoService.generateKeyPairWithCloudBackup(
        currentUserId,
        password
      );

      setKeyPair(newKeyPair);
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error refreshing keys");
      throw err;
    }
  };

  const getPublicKey = useCallback(
    async (userId: string): Promise<string | null> => {
      try {
        // Check cache first
        if (publicKeys.has(userId)) {
          return publicKeys.get(userId)!;
        }

        // Get from server
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("public_key")
          .eq("id", userId)
          .single();

        if (error || !profile?.public_key) {
          return null;
        }

        // Add to cache
        setPublicKeys((prev) => new Map(prev.set(userId, profile.public_key)));

        return profile.public_key;
      } catch (err) {
        return null;
      }
    },
    [publicKeys]
  );

  const encryptText = useCallback(
    async (text: string, recipientUserId: string): Promise<string> => {
      if (!keyPair) {
        throw new Error("Claves no inicializadas");
      }

      const recipientPublicKey = await getPublicKey(recipientUserId);
      if (!recipientPublicKey) {
        throw new Error("No se pudo obtener la clave pública del destinatario");
      }

      const encryptedData = await cryptoService.encryptText(
        text,
        recipientPublicKey,
        keyPair.privateKey
      );

      return JSON.stringify({
        ...encryptedData,
        senderPublicKey: keyPair.publicKey,
      });
    },
    [keyPair, getPublicKey]
  );

  const decryptText = useCallback(
    async (encryptedData: string, senderUserId: string): Promise<string> => {
      if (!keyPair) {
        throw new Error("Claves no inicializadas");
      }

      const senderPublicKey = await getPublicKey(senderUserId);
      if (!senderPublicKey) {
        throw new Error("No se pudo obtener la clave pública del remitente");
      }

      const data = JSON.parse(encryptedData);

      return await cryptoService.decryptText(
        {
          ciphertext: data.ciphertext,
          nonce: data.nonce,
        },
        senderPublicKey,
        keyPair.privateKey
      );
    },
    [keyPair, getPublicKey]
  );

  const encryptForSelf = useCallback(
    async (text: string): Promise<string> => {
      if (!keyPair) {
        throw new Error("Claves no inicializadas");
      }

      return await cryptoService.encryptForSelf(text, keyPair.privateKey);
    },
    [keyPair]
  );

  const decryptForSelf = useCallback(
    async (encryptedData: string): Promise<string> => {
      if (!keyPair) {
        throw new Error("Claves no inicializadas");
      }

      try {
        return await cryptoService.decryptForSelf(
          encryptedData,
          keyPair.privateKey
        );
      } catch (err) {
        // Mark decryption error
        setHasDecryptionErrors(true);
        throw err;
      }
    },
    [keyPair]
  );

  const debugKeys = async () => {
    console.log("🔍 === DIAGNÓSTICO DE CLAVES ===");

    // 0. Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log("0️⃣ Autenticación:");
    console.log("- Usuario autenticado:", !!user);
    console.log("- User ID:", user?.id);

    // 1. Estado actual del hook
    console.log("\n1️⃣ Estado del Hook:");
    console.log("- isReady:", isReady);
    console.log("- keyPair existe:", !!keyPair);
    console.log("- currentUserId:", currentUserId);
    console.log("- hasDecryptionErrors:", hasDecryptionErrors);

    // Si no hay usuario, intentar inicializar
    if (!user && !currentUserId) {
      console.log(
        "⚠️ No hay usuario autenticado. Las claves no pueden cargarse."
      );
      console.log("\n🔍 === FIN DIAGNÓSTICO ===");
      return;
    }

    const userId = currentUserId || user?.id;

    if (keyPair) {
      console.log(
        "- Public Key (primeros 20 chars):",
        keyPair.publicKey.substring(0, 20) + "..."
      );
      console.log(
        "- Private Key (primeros 20 chars):",
        keyPair.privateKey.substring(0, 20) + "..."
      );
    }

    // 2. Verificar claves en SecureStore
    if (userId) {
      console.log("\n2️⃣ SecureStore:");
      const localPrivateKey = await cryptoService.getPrivateKey(userId);
      console.log("- Private key en SecureStore:", !!localPrivateKey);
      if (localPrivateKey && keyPair) {
        console.log(
          "- Coincide con keyPair actual:",
          localPrivateKey === keyPair.privateKey
        );
      }
    }

    // 3. Verificar claves en BD
    if (currentUserId) {
      console.log("\n3️⃣ Base de datos:");
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "public_key, encrypted_private_key, private_key_salt, private_key_nonce, encryption_initialized_at"
        )
        .eq("id", currentUserId)
        .single();

      if (profile) {
        console.log("- Public key en BD:", !!profile.public_key);
        console.log(
          "- Public key (primeros 20 chars):",
          profile.public_key?.substring(0, 20) + "..."
        );
        console.log(
          "- Encrypted private key:",
          !!profile.encrypted_private_key
        );
        console.log(
          "- Encryption initialized:",
          profile.encryption_initialized_at
        );

        if (keyPair && profile.public_key) {
          console.log(
            "- Public key coincide:",
            profile.public_key === keyPair.publicKey
          );
        }
      } else {
        console.log("- Error obteniendo profile:", error);
      }
    }

    // 4. Probar cifrado/descifrado
    console.log("\n4️⃣ Prueba de cifrado/descifrado:");
    if (keyPair) {
      try {
        const testMessage = "test_" + Date.now();
        const encrypted = await encryptForSelf(testMessage);
        console.log("- Cifrado exitoso:", !!encrypted);

        const decrypted = await decryptForSelf(encrypted);
        console.log("- Descifrado exitoso:", decrypted === testMessage);
        console.log("- Mensaje original:", testMessage);
        console.log("- Mensaje descifrado:", decrypted);
      } catch (error) {
        console.log("- Error en prueba:", error);
      }
    }
    console.log("\n4.5️⃣ Prueba con contenido real:");
    try {
      const testEncrypted =
        '{"ciphertext":"9D189LUfLMfOc9jJ4cznGYHx6M5QLxa3Hl4=","nonce":"QCd8VkG5qTV8qDBWVf09+RBvjZmZw7xc","version":"nacl_secretbox_v1"}';
      const decrypted = await decryptForSelf(testEncrypted);
      console.log("- Descifrado del título real exitoso:", decrypted);
    } catch (error) {
      console.log("- Error descifrando título real:", error);

      // Mostrar más información del error
      if (keyPair) {
        console.log("- Private key length:", keyPair.privateKey.length);
        console.log(
          "- Private key (últimos 10 chars):",
          keyPair.privateKey.slice(-10)
        );
      }
    }
    // 5. Verificar contenido cifrado existente
    console.log("\n5️⃣ Contenido cifrado en BD:");
    const { data: encryptedContent, error: encError } = await supabase
      .from("encrypted_content")
      .select("id, content_type, created_at")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(3);

    if (encryptedContent) {
      console.log("- Contenido cifrado encontrado:", encryptedContent.length);
      encryptedContent.forEach((item, index) => {
        console.log(
          `  ${index + 1}. ${item.content_type} - ${item.created_at}`
        );
      });
    }

    console.log("\n🔍 === FIN DIAGNÓSTICO ===");
  };
  return {
    isReady,
    keyPair,
    publicKeys,
    generateKeys,
    getPublicKey,
    encryptText,
    decryptText,
    encryptForSelf,
    decryptForSelf,
    refreshKeys,
    debugKeys,
    hasDecryptionErrors,
    error,
  };
};
