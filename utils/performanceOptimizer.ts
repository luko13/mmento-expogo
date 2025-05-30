// utils/performanceOptimizer.ts
export interface PerformanceMetric {
  duration: number;
  size: number;
  timestamp: number;
  operation: string;
}

export interface OptimizationStrategy {
  useStreaming: boolean;
  chunkSize: number;
  compressionLevel: number;
  parallelChunks: number;
}

export class PerformanceOptimizer {
  private metrics = new Map<string, PerformanceMetric[]>();
  private readonly MAX_METRICS = 10;
  private readonly SLOW_THRESHOLD = 1000; // 1 second
  private readonly VERY_SLOW_THRESHOLD = 3000; // 3 seconds
  
  // Adaptive thresholds
  private adaptiveThresholds = {
    streaming: 5 * 1024 * 1024, // 5MB default
    compression: 2 * 1024 * 1024, // 2MB default
  };

  /**
   * Measure and optimize an operation
   */
  async measureAndOptimize<T>(
    operation: string,
    fn: (...args: any[]) => Promise<T>,
    ...args: any[]
  ): Promise<T> {
    const start = Date.now();
    const size = this.extractSize(args[0]);
    
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;
      
      // Store metrics
      this.storeMetric(operation, duration, size);
      
      // Log performance
      const speed = size > 0 ? (size / duration / 1024).toFixed(2) : 'N/A';
      console.log(`⏱️ ${operation}: ${duration}ms for ${(size / 1024 / 1024).toFixed(2)}MB (${speed} MB/s)`);
      
      // Analyze and adjust strategy
      if (duration > this.SLOW_THRESHOLD) {
        await this.adjustStrategy(operation, duration, size);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Performance issue in ${operation}:`, error);
      
      // Try with fallback strategy
      if (operation === 'encrypt' && size > this.adaptiveThresholds.streaming) {
        console.log('🔄 Retrying with streaming strategy...');
        return this.retryWithStreaming(fn, args);
      }
      
      throw error;
    }
  }

  /**
   * Get optimization strategy based on metrics
   */
  getOptimizationStrategy(fileSize: number): OptimizationStrategy {
    const encryptMetrics = this.getAverageMetrics('encrypt');
    const uploadMetrics = this.getAverageMetrics('upload');
    
    // Dynamic thresholds based on performance history
    const avgEncryptSpeed = encryptMetrics.avgSpeed || 1; // MB/s
    const avgUploadSpeed = uploadMetrics.avgSpeed || 0.5; // MB/s
    
    // Predict time for this file
    const predictedEncryptTime = (fileSize / 1024 / 1024) / avgEncryptSpeed * 1000;
    const predictedUploadTime = (fileSize / 1024 / 1024) / avgUploadSpeed * 1000;
    
    return {
      useStreaming: fileSize > this.adaptiveThresholds.streaming || predictedEncryptTime > 2000,
      chunkSize: this.calculateOptimalChunkSize(fileSize, avgEncryptSpeed),
      compressionLevel: this.calculateCompressionLevel(fileSize, predictedUploadTime),
      parallelChunks: this.calculateParallelChunks(avgEncryptSpeed)
    };
  }

  /**
   * Store performance metric
   */
  private storeMetric(operation: string, duration: number, size: number): void {
    const metrics = this.metrics.get(operation) || [];
    
    metrics.push({
      operation,
      duration,
      size,
      timestamp: Date.now()
    });
    
    // Keep only recent metrics
    if (metrics.length > this.MAX_METRICS) {
      metrics.shift();
    }
    
    this.metrics.set(operation, metrics);
  }

  /**
   * Get average metrics for an operation
   */
  getAverageMetrics(operation: string): {
    avgDuration: number;
    avgSize: number;
    avgSpeed: number;
    count: number;
  } {
    const metrics = this.metrics.get(operation) || [];
    
    if (metrics.length === 0) {
      return { avgDuration: 0, avgSize: 0, avgSpeed: 0, count: 0 };
    }
    
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const totalSize = metrics.reduce((sum, m) => sum + m.size, 0);
    
    const avgDuration = totalDuration / metrics.length;
    const avgSize = totalSize / metrics.length;
    const avgSpeed = avgSize > 0 ? (avgSize / avgDuration / 1024) : 0; // MB/s
    
    return {
      avgDuration,
      avgSize,
      avgSpeed,
      count: metrics.length
    };
  }

  /**
   * Adjust strategy based on performance
   */
  private async adjustStrategy(operation: string, duration: number, size: number): Promise<void> {
    console.warn(`⚠️ Slow ${operation} detected: ${duration}ms for ${(size / 1024 / 1024).toFixed(2)}MB`);
    
    if (duration > this.VERY_SLOW_THRESHOLD) {
      // Significantly slow - adjust thresholds
      if (operation === 'encrypt' && size < this.adaptiveThresholds.streaming) {
        // Lower streaming threshold
        this.adaptiveThresholds.streaming = Math.max(size * 0.8, 1024 * 1024);
        console.log(`📉 Lowered streaming threshold to ${(this.adaptiveThresholds.streaming / 1024 / 1024).toFixed(2)}MB`);
      }
    }
    
    // Log performance report
    this.logPerformanceReport();
  }

  /**
   * Calculate optimal chunk size based on performance
   */
  private calculateOptimalChunkSize(fileSize: number, avgSpeed: number): number {
    const baseChunkSize = 512 * 1024; // 512KB
    
    // Adjust based on speed
    if (avgSpeed > 5) { // Fast encryption
      return Math.min(1024 * 1024, fileSize / 4); // 1MB chunks max
    } else if (avgSpeed < 1) { // Slow encryption
      return Math.max(256 * 1024, baseChunkSize / 2); // Smaller chunks
    }
    
    return baseChunkSize;
  }

  /**
   * Calculate compression level based on upload speed
   */
  private calculateCompressionLevel(fileSize: number, predictedUploadTime: number): number {
    if (predictedUploadTime > 10000) { // > 10 seconds
      return 0.6; // High compression
    } else if (predictedUploadTime > 5000) { // > 5 seconds
      return 0.8; // Medium compression
    }
    
    return 1.0; // No compression for fast uploads
  }

  /**
   * Calculate parallel chunks based on performance
   */
  private calculateParallelChunks(avgSpeed: number): number {
    if (avgSpeed > 3) {
      return 4; // Fast device
    } else if (avgSpeed > 1) {
      return 3; // Normal device
    }
    
    return 2; // Slow device
  }

  /**
   * Retry with streaming strategy
   */
  private async retryWithStreaming<T>(fn: Function, args: any[]): Promise<T> {
    // This would be implemented in FileEncryptionService
    throw new Error('Streaming retry not implemented - override in service');
  }

  /**
   * Extract size from various input types
   */
  private extractSize(input: any): number {
    if (typeof input === 'number') return input;
    if (input?.length) return input.length;
    if (input?.size) return input.size;
    if (input?.byteLength) return input.byteLength;
    return 0;
  }

  /**
   * Log performance report
   */
  logPerformanceReport(): void {
    console.log('\n📊 Performance Report:');
    
    for (const [operation, metrics] of this.metrics.entries()) {
      const avg = this.getAverageMetrics(operation);
      console.log(`${operation}:`);
      console.log(`  - Avg Duration: ${avg.avgDuration.toFixed(0)}ms`);
      console.log(`  - Avg Size: ${(avg.avgSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  - Avg Speed: ${avg.avgSpeed.toFixed(2)}MB/s`);
      console.log(`  - Samples: ${avg.count}`);
    }
    
    console.log(`\n🎯 Adaptive Thresholds:`);
    console.log(`  - Streaming: ${(this.adaptiveThresholds.streaming / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  - Compression: ${(this.adaptiveThresholds.compression / 1024 / 1024).toFixed(2)}MB\n`);
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics.clear();
    this.adaptiveThresholds = {
      streaming: 5 * 1024 * 1024,
      compression: 2 * 1024 * 1024,
    };
  }

  /**
   * Export metrics for analytics
   */
  exportMetrics(): Record<string, PerformanceMetric[]> {
    const exported: Record<string, PerformanceMetric[]> = {};
    
    for (const [key, value] of this.metrics.entries()) {
      exported[key] = [...value];
    }
    
    return exported;
  }
}

// Singleton instance
export const performanceOptimizer = new PerformanceOptimizer();