// types/libsodium-wrappers.d.ts
declare module 'libsodium-wrappers' {
  export const ready: Promise<void>;
  
  // Stream cipher functions
  export function crypto_secretstream_xchacha20poly1305_keygen(): Uint8Array;
  
  export function crypto_secretstream_xchacha20poly1305_init_push(
    key: Uint8Array
  ): { state: any; header: Uint8Array };
  
  export function crypto_secretstream_xchacha20poly1305_push(
    state: any,
    message: Uint8Array,
    ad: Uint8Array | null,
    tag: number
  ): Uint8Array;
  
  export function crypto_secretstream_xchacha20poly1305_init_pull(
    header: Uint8Array,
    key: Uint8Array
  ): any;
  
  export function crypto_secretstream_xchacha20poly1305_pull(
    state: any,
    ciphertext: Uint8Array,
    ad: Uint8Array | null
  ): { message: Uint8Array; tag: number };
  
  // Constants
  export const crypto_secretstream_xchacha20poly1305_TAG_MESSAGE: number;
  export const crypto_secretstream_xchacha20poly1305_TAG_FINAL: number;
  export const crypto_secretstream_xchacha20poly1305_TAG_PUSH: number;
  export const crypto_secretstream_xchacha20poly1305_TAG_REKEY: number;
  
  // Hash functions
  export function crypto_hash(message: Uint8Array): Uint8Array;
  export function crypto_hash_sha256(message: Uint8Array): Uint8Array;
  export function crypto_hash_sha512(message: Uint8Array): Uint8Array;
  
  // Key derivation
  export function crypto_kdf_derive_from_key(
    subkey_len: number,
    subkey_id: number,
    ctx: string,
    key: Uint8Array
  ): Uint8Array;
  
  // Memory utilities
  export function memzero(buffer: Uint8Array): void;
  export function memcmp(a: Uint8Array, b: Uint8Array): number;
  
  // Default export (the main sodium object)
  interface SodiumInterface {
    ready: Promise<void>;
    crypto_secretstream_xchacha20poly1305_keygen(): Uint8Array;
    crypto_secretstream_xchacha20poly1305_init_push(key: Uint8Array): { state: any; header: Uint8Array };
    crypto_secretstream_xchacha20poly1305_push(state: any, message: Uint8Array, ad: Uint8Array | null, tag: number): Uint8Array;
    crypto_secretstream_xchacha20poly1305_init_pull(header: Uint8Array, key: Uint8Array): any;
    crypto_secretstream_xchacha20poly1305_pull(state: any, ciphertext: Uint8Array, ad: Uint8Array | null): { message: Uint8Array; tag: number };
    crypto_secretstream_xchacha20poly1305_TAG_MESSAGE: number;
    crypto_secretstream_xchacha20poly1305_TAG_FINAL: number;
    crypto_secretstream_xchacha20poly1305_TAG_PUSH: number;
    crypto_secretstream_xchacha20poly1305_TAG_REKEY: number;
    crypto_hash(message: Uint8Array): Uint8Array;
    crypto_hash_sha256(message: Uint8Array): Uint8Array;
    crypto_hash_sha512(message: Uint8Array): Uint8Array;
    crypto_kdf_derive_from_key(subkey_len: number, subkey_id: number, ctx: string, key: Uint8Array): Uint8Array;
    memzero(buffer: Uint8Array): void;
    memcmp(a: Uint8Array, b: Uint8Array): number;
  }
  
  const sodium: SodiumInterface;
  export default sodium;
}