// hooks/useEncryption.ts
import { useState, useEffect, useCallback } from 'react';
import { CryptoService, type KeyPair } from '../utils/cryptoService';
import { supabase } from '../lib/supabase';

export interface UseEncryptionReturn {
  isReady: boolean;
  keyPair: KeyPair | null;
  publicKeys: Map<string, string>;
  generateKeys: () => Promise<void>;
  getPublicKey: (userId: string) => Promise<string | null>;
  encryptText: (text: string, recipientUserId: string) => Promise<string>;
  decryptText: (encryptedData: string, senderUserId: string) => Promise<string>;
  encryptForSelf: (text: string) => Promise<string>;
  decryptForSelf: (encryptedData: string) => Promise<string>;
  error: string | null;
}

export const useEncryption = (): UseEncryptionReturn => {
  const [isReady, setIsReady] = useState(false);
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [publicKeys, setPublicKeys] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const cryptoService = CryptoService.getInstance();

  // Inicializar el hook
  useEffect(() => {
    initializeEncryption();
  }, []);

  const initializeEncryption = async () => {
    try {
      setError(null);
      
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      setCurrentUserId(user.id);

      // Intentar cargar clave privada existente
      const existingPrivateKey = await cryptoService.getPrivateKey(user.id);
      
      if (existingPrivateKey) {
        // Obtener clave pública del servidor
        const { data: profile } = await supabase
          .from('profiles')
          .select('public_key')
          .eq('id', user.id)
          .single();

        if (profile?.public_key) {
          setKeyPair({
            publicKey: profile.public_key,
            privateKey: existingPrivateKey
          });
        } else {
          // Regenerar par de claves si falta la pública
          await generateKeys();
        }
      } else {
        // Generar nuevo par de claves
        await generateKeys();
      }

      setIsReady(true);
    } catch (err) {
      console.error('Error inicializando cifrado:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  const generateKeys = async () => {
    try {
      if (!currentUserId) {
        throw new Error('Usuario no autenticado');
      }

      // Generar nuevo par de claves
      const newKeyPair = await cryptoService.generateKeyPair();
      
      // Guardar clave privada en SecureStore
      await cryptoService.storePrivateKey(newKeyPair.privateKey, currentUserId);
      
      // Enviar clave pública al servidor
      const { error } = await supabase
        .from('profiles')
        .update({ public_key: newKeyPair.publicKey })
        .eq('id', currentUserId);

      if (error) {
        throw new Error(`Error guardando clave pública: ${error.message}`);
      }

      setKeyPair(newKeyPair);
    } catch (err) {
      console.error('Error generando claves:', err);
      setError(err instanceof Error ? err.message : 'Error generando claves');
      throw err;
    }
  };

  const getPublicKey = useCallback(async (userId: string): Promise<string | null> => {
    try {
      // Verificar cache primero
      if (publicKeys.has(userId)) {
        return publicKeys.get(userId)!;
      }

      // Obtener del servidor
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('public_key')
        .eq('id', userId)
        .single();

      if (error || !profile?.public_key) {
        console.warn(`No se encontró clave pública para usuario ${userId}`);
        return null;
      }

      // Agregar al cache
      setPublicKeys(prev => new Map(prev.set(userId, profile.public_key)));
      
      return profile.public_key;
    } catch (err) {
      console.error('Error obteniendo clave pública:', err);
      return null;
    }
  }, [publicKeys]);

  const encryptText = useCallback(async (
    text: string, 
    recipientUserId: string
  ): Promise<string> => {
    if (!keyPair) {
      throw new Error('Claves no inicializadas');
    }

    const recipientPublicKey = await getPublicKey(recipientUserId);
    if (!recipientPublicKey) {
      throw new Error('No se pudo obtener la clave pública del destinatario');
    }

    const encryptedData = await cryptoService.encryptText(
      text,
      recipientPublicKey,
      keyPair.privateKey
    );

    return JSON.stringify({
      ...encryptedData,
      senderPublicKey: keyPair.publicKey
    });
  }, [keyPair, getPublicKey]);

  const decryptText = useCallback(async (
    encryptedData: string,
    senderUserId: string
  ): Promise<string> => {
    if (!keyPair) {
      throw new Error('Claves no inicializadas');
    }

    const senderPublicKey = await getPublicKey(senderUserId);
    if (!senderPublicKey) {
      throw new Error('No se pudo obtener la clave pública del remitente');
    }

    const data = JSON.parse(encryptedData);
    
    return await cryptoService.decryptText(
      {
        ciphertext: data.ciphertext,
        nonce: data.nonce
      },
      senderPublicKey,
      keyPair.privateKey
    );
  }, [keyPair, getPublicKey]);

  const encryptForSelf = useCallback(async (text: string): Promise<string> => {
    if (!keyPair) {
      throw new Error('Claves no inicializadas');
    }

    return await cryptoService.encryptForSelf(text, keyPair.privateKey);
  }, [keyPair]);

  const decryptForSelf = useCallback(async (encryptedData: string): Promise<string> => {
    if (!keyPair) {
      throw new Error('Claves no inicializadas');
    }

    return await cryptoService.decryptForSelf(encryptedData, keyPair.privateKey);
  }, [keyPair]);

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
    error
  };
};