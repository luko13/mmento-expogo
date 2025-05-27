// utils/fileEncryption.ts - Fixed version
import { CryptoService } from './cryptoService';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';

export interface EncryptedFileMetadata {
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  encryptedKeys: Array<{
    userId: string;
    encryptedKey: string;
    nonce: string;
  }>;
  fileNonce: string;
}

export class FileEncryptionService {
  private cryptoService = CryptoService.getInstance();

  /**
   * Encrypts and uploads a file
   */
  async encryptAndUploadFile(
    fileUri: string,
    fileName: string,
    mimeType: string,
    authorUserId: string,
    recipientUserIds: string[],
    getPublicKey: (userId: string) => Promise<string | null>,
    getPrivateKey: () => string
  ): Promise<EncryptedFileMetadata> {
    try {
      // 1. Verificar autenticación
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuario no autenticado');
      }

      // 2. Generate symmetric key
      const symmetricKey = await this.cryptoService.generateSymmetricKey();
      
      // 3. Read file info
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('Archivo no encontrado');
      }

      // 4. Read file data as base64
      const fileData = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      const fileBuffer = this.base64ToUint8Array(fileData);
      
      // 5. Encrypt file with symmetric key
      const { encrypted, nonce } = await this.cryptoService.encryptFile(fileBuffer, symmetricKey);

      // 6. Encrypt symmetric key for each recipient
      const privateKey = getPrivateKey();
      const encryptedKeys = [];
      
      for (const userId of recipientUserIds) {
        const publicKey = await getPublicKey(userId);
        if (publicKey) {
          const encryptedKeyData = await this.cryptoService.encryptSymmetricKey(
            symmetricKey,
            publicKey,
            privateKey
          );
          
          encryptedKeys.push({
            userId,
            encryptedKey: encryptedKeyData.ciphertext,
            nonce: encryptedKeyData.nonce
          });
        }
      }

      // 7. Upload encrypted file - Using base64 for React Native compatibility
      const fileId = `encrypted_${Date.now()}_${authorUserId}`;
      const filePath = `encrypted_files/${fileId}`;
      
      // Convert encrypted Uint8Array to base64 for upload
      const encryptedBase64 = this.uint8ArrayToBase64(encrypted);
      
      // Convert base64 to ArrayBuffer for Supabase
      const binaryString = atob(encryptedBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('encrypted_media')
        .upload(filePath, bytes.buffer, {
          contentType: 'application/octet-stream',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error detallado de subida:', uploadError);
        throw new Error(`Error subiendo archivo: ${uploadError.message}`);
      }

      // 8. Create metadata
      const fileSize = 'size' in fileInfo ? fileInfo.size : 0;
      const metadata: EncryptedFileMetadata = {
        fileId,
        originalName: fileName,
        mimeType,
        size: fileSize,
        encryptedKeys,
        fileNonce: this.uint8ArrayToBase64(nonce)
      };

      // 9. Save metadata to database
      const { error: metadataError } = await supabase
        .from('encrypted_files')
        .insert({
          file_id: fileId,
          original_name: fileName,
          mime_type: mimeType,
          size: fileSize,
          author_id: authorUserId,
          file_nonce: metadata.fileNonce,
          header: JSON.stringify({
            version: '1.0',
            algorithm: 'nacl-secretbox',
            keyDerivation: 'nacl-box'
          }),
          chunks: 1, // Single chunk for now
          created_at: new Date().toISOString()
        });

      if (metadataError) {
        // Si falla la metadata, eliminar el archivo subido
        await supabase.storage
          .from('encrypted_media')
          .remove([filePath]);
        throw new Error(`Error guardando metadata: ${metadataError.message}`);
      }

      // 10. Save encrypted keys
      for (const keyData of encryptedKeys) {
        const { error: keyError } = await supabase
          .from('encrypted_file_keys')
          .insert({
            file_id: fileId,
            user_id: keyData.userId,
            encrypted_key: keyData.encryptedKey,
            nonce: keyData.nonce,
            created_at: new Date().toISOString()
          });

        if (keyError) {
          console.error('Error guardando clave cifrada:', keyError);
        }
      }

      return metadata;
    } catch (error) {
      console.error('Error cifrando y subiendo archivo:', error);
      throw error;
    }
  }

  /**
   * Downloads and decrypts a file
   */
  async downloadAndDecryptFile(
    fileId: string,
    userId: string,
    getPublicKey: (userId: string) => Promise<string | null>,
    getPrivateKey: () => string
  ): Promise<{
    data: Uint8Array;
    fileName: string;
    mimeType: string;
  }> {
    try {
      // Verificar sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuario no autenticado');
      }
  
      // 1. Get file metadata
      const { data: fileMetadata, error: metadataError } = await supabase
        .from('encrypted_files')
        .select('*')
        .eq('file_id', fileId)
        .single();
  
      if (metadataError || !fileMetadata) {
        throw new Error('Archivo no encontrado');
      }
  
      // 2. Get encrypted key for user
      const { data: keyData, error: keyError } = await supabase
        .from('encrypted_file_keys')
        .select('*')
        .eq('file_id', fileId)
        .eq('user_id', userId)
        .single();
  
      if (keyError || !keyData) {
        throw new Error('No tienes acceso a este archivo');
      }
  
      // 3. Get author's public key
      const authorPublicKey = await getPublicKey(fileMetadata.author_id);
      if (!authorPublicKey) {
        throw new Error('No se pudo obtener la clave del autor');
      }
  
      // 4. Decrypt symmetric key
      const symmetricKey = await this.cryptoService.decryptSymmetricKey(
        {
          ciphertext: keyData.encrypted_key,
          nonce: keyData.nonce
        },
        authorPublicKey,
        getPrivateKey()
      );
  
      // 5. Download encrypted file
      console.log(`📥 Descargando archivo cifrado: ${fileId}`);
      
      const { data: encryptedFile, error: downloadError } = await supabase.storage
        .from('encrypted_media')
        .download(`encrypted_files/${fileId}`);
      
      if (downloadError || !encryptedFile) {
        console.error('Error descargando archivo:', downloadError);
        throw new Error(`Error descargando archivo cifrado: ${downloadError?.message || 'Unknown error'}`);
      }
  
      // 6. Convertir a Uint8Array
      let fileBuffer: Uint8Array;
      
      try {
        // React Native + Supabase devuelve un Blob
        if (encryptedFile && typeof encryptedFile === 'object') {
          if ('arrayBuffer' in encryptedFile && typeof encryptedFile.arrayBuffer === 'function') {
            fileBuffer = new Uint8Array(await encryptedFile.arrayBuffer());
          } else if (encryptedFile instanceof ArrayBuffer) {
            fileBuffer = new Uint8Array(encryptedFile);
          } else if (encryptedFile instanceof Uint8Array) {
            fileBuffer = encryptedFile;
          } else {
            // Manejar Blob sin arrayBuffer (React Native)
            const response = new Response(encryptedFile as Blob);
            const arrayBuffer = await response.arrayBuffer();
            fileBuffer = new Uint8Array(arrayBuffer);
          }
        } else {
          throw new Error('Formato de archivo no reconocido');
        }
      } catch (error) {
        console.error('Error convirtiendo archivo:', error);
        throw new Error('Error procesando archivo descargado');
      }
  
      // 7. Decrypt file
      const fileNonce = this.base64ToUint8Array(fileMetadata.file_nonce);
      
      const decryptedFile = await this.cryptoService.decryptFile(
        fileBuffer,
        fileNonce,
        symmetricKey
      );
  
      console.log('✅ Archivo descifrado exitosamente');
  
      return {
        data: decryptedFile,
        fileName: fileMetadata.original_name,
        mimeType: fileMetadata.mime_type
      };
    } catch (error) {
      console.error('Error descargando y descifrando archivo:', error);
      throw error;
    }
  }

  // Helper methods
  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private uint8ArrayToBase64(uint8Array: Uint8Array): string {
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binaryString);
  }
}