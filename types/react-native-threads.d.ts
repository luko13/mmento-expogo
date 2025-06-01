// types/react-native-threads.d.ts
declare module 'react-native-threads' {
    export class Thread {
      constructor(jsPath: string);
      onmessage: ((message: string) => void) | null;
      onerror: ((error: any) => void) | null;
      postMessage(message: string): void;
      terminate(): void;
    }
  
    export interface ThreadInterface {
      onmessage: ((message: string) => void) | null;
      postMessage(message: string): void;
    }
  
    export const self: ThreadInterface;
  }