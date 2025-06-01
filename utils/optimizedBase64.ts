// utils/optimizedBase64.ts
import { Buffer } from 'buffer';

export class OptimizedBase64 {
  // Tamaño de chunk optimizado basado en benchmarks
  private static readonly OPTIMAL_CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  
  /**
   * Convierte Uint8Array a Base64 de forma eficiente
   */
  static async uint8ArrayToBase64(data: Uint8Array): Promise<string> {
    // Para archivos pequeños (< 5MB), usar Buffer directamente
    if (data.length < 5 * 1024 * 1024) {
      return Buffer.from(data).toString('base64');
    }
    
    // Para archivos grandes, procesar en chunks paralelos
    const numChunks = Math.ceil(data.length / this.OPTIMAL_CHUNK_SIZE);
    const chunks: Promise<string>[] = [];
    
    for (let i = 0; i < numChunks; i++) {
      const start = i * this.OPTIMAL_CHUNK_SIZE;
      const end = Math.min(start + this.OPTIMAL_CHUNK_SIZE, data.length);
      
      chunks.push(
        Promise.resolve(Buffer.from(data.slice(start, end)).toString('base64'))
      );
    }
    
    const results = await Promise.all(chunks);
    return results.join('');
  }
  
  /**
   * Convierte Base64 a Uint8Array de forma eficiente
   */
  static async base64ToUint8Array(base64: string): Promise<Uint8Array> {
    // Para strings pequeños, conversión directa
    if (base64.length < 5 * 1024 * 1024) {
      return Uint8Array.from(Buffer.from(base64, 'base64'));
    }
    
    // Para strings grandes, dividir y procesar
    const chunkSize = this.OPTIMAL_CHUNK_SIZE * 4 / 3; // Base64 es ~33% más grande
    const numChunks = Math.ceil(base64.length / chunkSize);
    const chunks: Uint8Array[] = [];
    
    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, base64.length);
      const chunk = base64.slice(start, end);
      
      chunks.push(Uint8Array.from(Buffer.from(chunk, 'base64')));
    }
    
    // Combinar chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }
  
  /**
   * Versión streaming para archivos muy grandes (> 50MB)
   */
  static async *uint8ArrayToBase64Stream(
    data: Uint8Array, 
    onProgress?: (progress: number) => void
  ): AsyncGenerator<string, void, unknown> {
    const totalChunks = Math.ceil(data.length / this.OPTIMAL_CHUNK_SIZE);
    let processedChunks = 0;
    
    for (let i = 0; i < data.length; i += this.OPTIMAL_CHUNK_SIZE) {
      const chunk = data.slice(i, i + this.OPTIMAL_CHUNK_SIZE);
      yield Buffer.from(chunk).toString('base64');
      
      processedChunks++;
      if (onProgress) {
        onProgress((processedChunks / totalChunks) * 100);
      }
    }
  }
}