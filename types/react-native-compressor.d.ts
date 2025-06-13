declare module 'react-native-compressor' {
  export interface VideoCompressOptions {
    compressionMethod?: 'auto' | 'manual';
    bitrate?: number;
    minimumBitrate?: number;
    maxSize?: number;
    progressDivider?: number;
    getCancellationId?: (id: string) => void;
  }

  export interface ImageCompressOptions {
    compressionMethod?: 'auto' | 'manual';
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  }

  export interface AudioCompressOptions {
    bitrate?: number;
    quality?: 'low' | 'medium' | 'high';
  }

  export interface VideoMetadata {
    duration: number;
    extension: string;
    height: number;
    size: number;
    width: number;
  }

  export const Video: {
    compress: (
      uri: string,
      options?: VideoCompressOptions,
      onProgress?: (progress: number) => void
    ) => Promise<string>;
    cancelCompression: (id: string) => void;
  };

  export const Image: {
    compress: (
      uri: string,
      options?: ImageCompressOptions,
      onProgress?: (progress: number) => void
    ) => Promise<string>;
  };

  export const Audio: {
    compress: (
      uri: string,
      options?: AudioCompressOptions,
      onProgress?: (progress: number) => void
    ) => Promise<string>;
  };

  export function createVideoThumbnail(uri: string): Promise<string>;
  export function clearCache(): Promise<void>;
  export function getVideoMetaData(uri: string): Promise<VideoMetadata>;
  export function getRealPath(uri: string, type: 'video' | 'image'): Promise<string>;
}