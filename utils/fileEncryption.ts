// utils/fileEncryption.ts
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
  header: string; // Para stream cipher
  chunks: number;
}

// Tipos específicos para la respuesta de Supabase
interface SupabaseEncryptedFileData {
  original_name: string;
  mime_type: string;
  size: number;
  author_id: string;
  created_at: string;
}

interface SupabaseFileKeyResponse {
  file_id: string;
  encrypted_files: SupabaseEncryptedFileData;
}

export class FileEncryptionService {
  private cryptoService = CryptoService.getInstance();
  private readonly CHUNK_SIZE = 64 * 1024; // 64KB chunks

  /**
   * Cifra y sube un archivo
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
      // 1. Generar clave simétrica
      const symmetricKey = await this.cryptoService.generateSymmetricKey();
      
      // 2. Leer archivo y obtener información
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('Archivo no encontrado');
      }

      // 3. Inicializar cifrado de stream
      const { state, header } = await this.cryptoService.initStreamEncryption(symmetricKey);
      
      // 4. Leer y cifrar archivo en chunks
      const encryptedChunks: Uint8Array[] = [];
      const fileSize = 'size' in fileInfo ? fileInfo.size : 0;
      const totalChunks = Math.ceil(fileSize / this.CHUNK_SIZE);
      
      // Leer archivo como base64 y convertir a chunks
      const fileData = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      const fileBuffer = this.base64ToUint8Array(fileData);
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * this.CHUNK_SIZE;
        const end = Math.min(start + this.CHUNK_SIZE, fileBuffer.length);
        const chunk = fileBuffer.slice(start, end);
        const isLastChunk = i === totalChunks - 1;
        
        const encryptedChunk = await this.cryptoService.encryptChunk(
          state,
          chunk,
          isLastChunk
        );
        
        encryptedChunks.push(encryptedChunk);
      }

      // 5. Cifrar clave simétrica para cada destinatario
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

      // 6. Subir archivo cifrado
      const fileId = `encrypted_${Date.now()}_${authorUserId}`;
      const filePath = `encrypted_files/${fileId}`;
      
      // Combinar header y chunks cifrados
      const combinedData = this.combineEncryptedData(header, encryptedChunks);
      
      const { error: uploadError } = await supabase.storage
        .from('encrypted_media')
        .upload(filePath, combinedData, {
          contentType: 'application/octet-stream',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Error subiendo archivo: ${uploadError.message}`);
      }

      // 7. Crear metadata
      const metadata: EncryptedFileMetadata = {
        fileId,
        originalName: fileName,
        mimeType,
        size: fileSize,
        encryptedKeys,
        header: this.uint8ArrayToBase64(header),
        chunks: totalChunks
      };

      // 8. Guardar metadata en base de datos
      const { error: metadataError } = await supabase
        .from('encrypted_files')
        .insert({
          file_id: fileId,
          original_name: fileName,
          mime_type: mimeType,
          size: fileSize,
          author_id: authorUserId,
          header: metadata.header,
          chunks: totalChunks,
          created_at: new Date().toISOString()
        });

      if (metadataError) {
        throw new Error(`Error guardando metadata: ${metadataError.message}`);
      }

      // 9. Guardar claves cifradas
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
   * Descarga y descifra un archivo
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
      // 1. Obtener metadata del archivo
      const { data: fileMetadata, error: metadataError } = await supabase
        .from('encrypted_files')
        .select('*')
        .eq('file_id', fileId)
        .single();

      if (metadataError || !fileMetadata) {
        throw new Error('Archivo no encontrado');
      }

      // 2. Obtener clave cifrada para el usuario
      const { data: keyData, error: keyError } = await supabase
        .from('encrypted_file_keys')
        .select('*')
        .eq('file_id', fileId)
        .eq('user_id', userId)
        .single();

      if (keyError || !keyData) {
        throw new Error('No tienes acceso a este archivo');
      }

      // 3. Obtener clave pública del autor
      const authorPublicKey = await getPublicKey(fileMetadata.author_id);
      if (!authorPublicKey) {
        throw new Error('No se pudo obtener la clave del autor');
      }

      // 4. Descifrar clave simétrica
      const symmetricKey = await this.cryptoService.decryptSymmetricKey(
        {
          ciphertext: keyData.encrypted_key,
          nonce: keyData.nonce
        },
        authorPublicKey,
        getPrivateKey()
      );

      // 5. Descargar archivo cifrado
      const { data: encryptedFile, error: downloadError } = await supabase.storage
        .from('encrypted_media')
        .download(`encrypted_files/${fileId}`);

      if (downloadError || !encryptedFile) {
        throw new Error('Error descargando archivo');
      }

      // 6. Separar header y chunks
      const fileBuffer = new Uint8Array(await encryptedFile.arrayBuffer());
      const header = this.base64ToUint8Array(fileMetadata.header);
      const encryptedData = fileBuffer.slice(header.length);

      // 7. Inicializar descifrado de stream
      const state = await this.cryptoService.initStreamDecryption(header, symmetricKey);

      // 8. Descifrar chunks
      const decryptedChunks: Uint8Array[] = [];
      let offset = 0;

      for (let i = 0; i < fileMetadata.chunks; i++) {
        // En un stream cipher, cada chunk puede tener diferente tamaño debido al overhead
        // Necesitamos determinar el tamaño del chunk cifrado
        const chunkSize = this.getEncryptedChunkSize(encryptedData, offset);
        const encryptedChunk = encryptedData.slice(offset, offset + chunkSize);
        
        const { message } = await this.cryptoService.decryptChunk(state, encryptedChunk);
        decryptedChunks.push(message);
        
        offset += chunkSize;
      }

      // 9. Combinar chunks descifrados
      const totalSize = decryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const decryptedFile = new Uint8Array(totalSize);
      let writeOffset = 0;

      for (const chunk of decryptedChunks) {
        decryptedFile.set(chunk, writeOffset);
        writeOffset += chunk.length;
      }

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

  /**
   * Obtiene la lista de archivos cifrados accesibles por un usuario
   */
  async getAccessibleFiles(userId: string): Promise<Array<{
    fileId: string;
    fileName: string;
    mimeType: string;
    size: number;
    authorId: string;
    createdAt: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('encrypted_file_keys')
        .select(`
          file_id,
          encrypted_files (
            original_name,
            mime_type,
            size,
            author_id,
            created_at
          )
        `)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Error obteniendo archivos: ${error.message}`);
      }

      // Manejo seguro de tipos sin type guards complejos
      if (!data || !Array.isArray(data)) {
        return [];
      }

      return data
        .filter((item: any) => {
          // Verificación básica de estructura
          return item && 
                 item.file_id && 
                 item.encrypted_files && 
                 item.encrypted_files.original_name;
        })
        .map((item: any) => {
          // Manejar tanto objeto único como array
          const fileData = Array.isArray(item.encrypted_files) 
            ? item.encrypted_files[0] 
            : item.encrypted_files;
            
          return {
            fileId: item.file_id,
            fileName: fileData.original_name,
            mimeType: fileData.mime_type,
            size: fileData.size,
            authorId: fileData.author_id,
            createdAt: fileData.created_at
          };
        });
    } catch (error) {
      console.error('Error obteniendo archivos accesibles:', error);
      return [];
    }
  }

  /**
   * Revoca el acceso de un usuario a un archivo
   */
  async revokeFileAccess(fileId: string, userId: string, authorId: string): Promise<boolean> {
    try {
      // Verificar que quien revoca es el autor
      const { data: fileData } = await supabase
        .from('encrypted_files')
        .select('author_id')
        .eq('file_id', fileId)
        .single();

      if (!fileData || fileData.author_id !== authorId) {
        throw new Error('No tienes permisos para revocar acceso a este archivo');
      }

      const { error } = await supabase
        .from('encrypted_file_keys')
        .delete()
        .eq('file_id', fileId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Error revocando acceso: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error revocando acceso:', error);
      return false;
    }
  }

  /**
   * Concede acceso a un archivo a nuevos usuarios
   */
  async grantFileAccess(
    fileId: string,
    newUserIds: string[],
    authorId: string,
    getPublicKey: (userId: string) => Promise<string | null>,
    getPrivateKey: () => string
  ): Promise<boolean> {
    try {
      // Verificar que quien concede es el autor
      const { data: fileData } = await supabase
        .from('encrypted_files')
        .select('author_id')
        .eq('file_id', fileId)
        .single();

      if (!fileData || fileData.author_id !== authorId) {
        throw new Error('No tienes permisos para conceder acceso a este archivo');
      }

      // Obtener la clave cifrada del autor
      const { data: authorKeyData } = await supabase
        .from('encrypted_file_keys')
        .select('*')
        .eq('file_id', fileId)
        .eq('user_id', authorId)
        .single();

      if (!authorKeyData) {
        throw new Error('No se pudo obtener la clave del archivo');
      }

      // Descifrar la clave simétrica
      const authorPublicKey = await getPublicKey(authorId);
      if (!authorPublicKey) {
        throw new Error('No se pudo obtener la clave pública del autor');
      }

      const symmetricKey = await this.cryptoService.decryptSymmetricKey(
        {
          ciphertext: authorKeyData.encrypted_key,
          nonce: authorKeyData.nonce
        },
        authorPublicKey,
        getPrivateKey()
      );

      // Cifrar la clave para cada nuevo usuario
      const privateKey = getPrivateKey();
      for (const userId of newUserIds) {
        const publicKey = await getPublicKey(userId);
        if (publicKey) {
          const encryptedKeyData = await this.cryptoService.encryptSymmetricKey(
            symmetricKey,
            publicKey,
            privateKey
          );

          const { error } = await supabase
            .from('encrypted_file_keys')
            .insert({
              file_id: fileId,
              user_id: userId,
              encrypted_key: encryptedKeyData.ciphertext,
              nonce: encryptedKeyData.nonce,
              created_at: new Date().toISOString()
            });

          if (error) {
            console.error(`Error concediendo acceso a usuario ${userId}:`, error);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error concediendo acceso:', error);
      return false;
    }
  }

  // Métodos auxiliares privados

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

  private combineEncryptedData(header: Uint8Array, chunks: Uint8Array[]): Uint8Array {
    const totalSize = header.length + chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalSize);
    
    combined.set(header, 0);
    let offset = header.length;
    
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    return combined;
  }

  private getEncryptedChunkSize(data: Uint8Array, offset: number): number {
    // Para XChaCha20-Poly1305, cada chunk tiene 17 bytes de overhead (16 para MAC + 1 para tag)
    // Necesitamos leer el tamaño del chunk desde los metadatos o usar un tamaño fijo
    // Por simplicidad, asumimos chunks de tamaño fijo + overhead
    const OVERHEAD = 17;
    const remainingData = data.length - offset;
    const expectedChunkSize = this.CHUNK_SIZE + OVERHEAD;
    
    return Math.min(expectedChunkSize, remainingData);
  }
}