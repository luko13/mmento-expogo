declare module 'react-native-compressor' {
    interface VideoCompressOptions {
      compressionMethod?: 'auto' | 'manual';
      maxSize?: number;
      minimumBitrate?: number;
      bitrateMultiplier?: number;
      saveToCameraRoll?: boolean;
      removeAudio?: boolean;
      maxDuration?: number;
      bitrate?: string;
      fps?: number;
      speed?: string;
      quality?: string;
    }
  
    interface ImageCompressOptions {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      output?: 'jpg' | 'png';
    }
  
    interface AudioCompressOptions {
      bitrate?: number;
      samplerate?: number;
      channels?: number;
    }
  
    export namespace Image {
      function compress(uri: string, options?: ImageCompressOptions): Promise<string>;
    }
  
    export namespace Video {
      function compress(
        uri: string, 
        options?: VideoCompressOptions, 
        onProgress?: (progress: number) => void
      ): Promise<string>;
    }
  
    export namespace Audio {
      function compress(uri: string, options?: AudioCompressOptions): Promise<string>;
    }
  }