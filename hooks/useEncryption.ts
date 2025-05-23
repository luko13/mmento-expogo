// hooks/useEncryption.ts - Fixed version
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

  // Only initialize after user authentication
  useEffect(() => {
    let mounted = true;
    
    const checkAuthAndInitialize = async () => {
      try {
        // Check if user is authenticated first
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // User not authenticated, don't initialize crypto
          if (mounted) {
            setIsReady(false);
            setError(null);
          }
          return;
        }

        if (mounted) {
          setCurrentUserId(user.id);
          await initializeEncryption(user.id);
        }
      } catch (err) {
        if (mounted) {
          console.error('Error checking auth:', err);
          setError(err instanceof Error ? err.message : 'Error desconocido');
        }
      }
    };

    checkAuthAndInitialize();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setCurrentUserId(session.user.id);
          await initializeEncryption(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          // Clear crypto state on logout
          setKeyPair(null);
          setPublicKeys(new Map());
          setIsReady(false);
          setCurrentUserId(null);
          setError(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const initializeEncryption = async (userId: string) => {
    try {
      setError(null);

      // Try to load existing private key
      const existingPrivateKey = await cryptoService.getPrivateKey(userId);
      
      if (existingPrivateKey) {
        // Get public key from server
        const { data: profile } = await supabase
          .from('profiles')
          .select('public_key')
          .eq('id', userId)
          .single();

        if (profile?.public_key) {
          setKeyPair({
            publicKey: profile.public_key,
            privateKey: existingPrivateKey
          });
        } else {
          // Regenerate keypair if public key is missing
          await generateKeys();
        }
      }
      // Don't auto-generate keys - let user trigger this explicitly

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

      // Generate new keypair
      const newKeyPair = await cryptoService.generateKeyPair();
      
      // Store private key securely
      await cryptoService.storePrivateKey(newKeyPair.privateKey, currentUserId);
      
      // Send public key to server
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
      // Check cache first
      if (publicKeys.has(userId)) {
        return publicKeys.get(userId)!;
      }

      // Get from server
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('public_key')
        .eq('id', userId)
        .single();

      if (error || !profile?.public_key) {
        console.warn(`No se encontró clave pública para usuario ${userId}`);
        return null;
      }

      // Add to cache
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