// Declaración de tipos básica para react-native-video-compressor
declare module 'react-native-video-compressor' {
    interface CompressOptions {
      quality?: 'low' | 'medium' | 'high';
      compressionMethod?: 'auto' | 'manual';
      // Añade más opciones si las necesitas
    }
  
    export function compress(
      uri: string,
      options?: CompressOptions
    ): Promise<string>;
  
    // Exporta otras funciones del módulo según necesites
  }