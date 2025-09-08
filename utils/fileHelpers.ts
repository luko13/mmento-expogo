// utils/fileHelpers.ts
import * as FileSystem from 'expo-file-system';

/**
 * Copia un archivo temporal a una ubicación persistente en el directorio de documentos
 * @param sourceUri URI del archivo temporal (de cámara o picker)
 * @param fileName Nombre deseado para el archivo
 * @returns Nueva URI del archivo persistente
 */
export async function copyToPersistentStorage(sourceUri: string, fileName: string): Promise<string> {
  try {
    // Crear directorio para archivos de la app si no existe
    const appDirectory = `${FileSystem.documentDirectory}mmento/`;
    const dirInfo = await FileSystem.getInfoAsync(appDirectory);
    
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(appDirectory, { intermediates: true });
    }

    // Determinar la extensión del archivo
    let extension = '';
    if (sourceUri.includes('.jpg') || sourceUri.includes('.jpeg')) {
      extension = '.jpg';
    } else if (sourceUri.includes('.png')) {
      extension = '.png';
    } else if (sourceUri.includes('.mov')) {
      extension = '.mov';
    } else if (sourceUri.includes('.mp4')) {
      extension = '.mp4';
    } else {
      // Intentar detectar por el nombre del archivo
      const parts = sourceUri.split('.');
      if (parts.length > 1) {
        extension = '.' + parts[parts.length - 1];
      }
    }

    // Crear nombre único para el archivo
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const newFileName = `${fileName}_${timestamp}_${randomString}${extension}`;
    const destUri = `${appDirectory}${newFileName}`;

    // Verificar que el archivo fuente existe
    const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
    if (!sourceInfo.exists) {
      console.error('Archivo fuente no existe:', sourceUri);
      throw new Error('El archivo fuente no existe');
    }

    // Copiar el archivo
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destUri
    });

    // Verificar que la copia fue exitosa
    const destInfo = await FileSystem.getInfoAsync(destUri);
    if (!destInfo.exists) {
      throw new Error('Error al copiar el archivo');
    }

    console.log(`✅ Archivo copiado: ${sourceUri} -> ${destUri}`);
    return destUri;
  } catch (error) {
    console.error('Error copiando archivo a almacenamiento persistente:', error);
    throw error;
  }
}

/**
 * Limpia archivos antiguos del directorio de la app
 * @param maxAgeDays Edad máxima en días de los archivos a mantener
 */
export async function cleanupOldFiles(maxAgeDays: number = 7): Promise<void> {
  try {
    const appDirectory = `${FileSystem.documentDirectory}mmento/`;
    const dirInfo = await FileSystem.getInfoAsync(appDirectory);
    
    if (!dirInfo.exists) {
      return;
    }

    const files = await FileSystem.readDirectoryAsync(appDirectory);
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const file of files) {
      const filePath = `${appDirectory}${file}`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      
      if (fileInfo.exists && 'modificationTime' in fileInfo) {
        const fileAge = now - (fileInfo.modificationTime * 1000);
        if (fileAge > maxAgeMs) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          console.log(`🗑️ Archivo antiguo eliminado: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error('Error limpiando archivos antiguos:', error);
  }
}

/**
 * Obtiene el tamaño de un archivo en MB
 * @param uri URI del archivo
 * @returns Tamaño en MB o null si no se puede obtener
 */
export async function getFileSizeInMB(uri: string): Promise<number | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists && 'size' in fileInfo) {
      return fileInfo.size / (1024 * 1024);
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo tamaño del archivo:', error);
    return null;
  }
}