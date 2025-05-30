/**
 * Declaraciones de tipos para `libsodium-wrappers-sumo`.
 * Incluye funciones de cifrado secretbox, streaming, hash, pwhash, y utilidades.
 */

declare module "libsodium-wrappers-sumo" {
  /** Se resuelve cuando el WASM de sodium está listo */
  export const ready: Promise<void>;

  /** Genera bytes aleatorios (nativo de libsodium-sumo) */
  export function randombytes_buf(length: number): Uint8Array;

  /** No. de bytes de nonce para crypto_secretbox */
  export const crypto_secretbox_NONCEBYTES: number;

  /** Cifra un mensaje con secretbox (XSalsa20-Poly1305) */
  export function crypto_secretbox_easy(
    message: Uint8Array,
    nonce: Uint8Array,
    key: Uint8Array
  ): Uint8Array;

  /** Descifra un ciphertext con secretbox; retorna null si falla */
  export function crypto_secretbox_open_easy(
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    key: Uint8Array
  ): Uint8Array | null;

  /** Constant y funciones de cifrado por streaming */
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

  export const crypto_secretstream_xchacha20poly1305_TAG_MESSAGE: number;
  export const crypto_secretstream_xchacha20poly1305_TAG_FINAL: number;
  export const crypto_secretstream_xchacha20poly1305_TAG_PUSH: number;
  export const crypto_secretstream_xchacha20poly1305_TAG_REKEY: number;

  /** Hashes */
  export function crypto_hash(message: Uint8Array): Uint8Array;
  export function crypto_hash_sha256(message: Uint8Array): Uint8Array;
  export function crypto_hash_sha512(message: Uint8Array): Uint8Array;

  /** Derivación de clave KDF */
  export function crypto_kdf_derive_from_key(
    subkey_len: number,
    subkey_id: number,
    ctx: string,
    key: Uint8Array
  ): Uint8Array;

  /** Funciones de borrado seguro y comparación */
  export function memzero(buffer: Uint8Array): void;
  export function memcmp(a: Uint8Array, b: Uint8Array): number;

  /** Argon2id Password Hashing (sodium.pwhash) */
  export function crypto_pwhash(
    outLen: number,
    passwd: string | Uint8Array,
    salt: Uint8Array,
    opsLimit: number,
    memLimit: number,
    alg: number
  ): Uint8Array;
  export const crypto_pwhash_ALG_ARGON2ID13: number;
  export const crypto_pwhash_SALTBYTES: number;
  export const crypto_pwhash_OPSLIMIT_MIN: number;
  export const crypto_pwhash_OPSLIMIT_MODERATE: number;
  export const crypto_pwhash_OPSLIMIT_SENSITIVE: number;
  export const crypto_pwhash_MEMLIMIT_MIN: number;
  export const crypto_pwhash_MEMLIMIT_MODERATE: number;
  export const crypto_pwhash_MEMLIMIT_SENSITIVE: number;

  /** Exportación por defecto: objeto sodium con todas las funciones anteriores */
  const sodium: {
    ready: Promise<void>;
    randombytes_buf(length: number): Uint8Array;
    crypto_secretbox_NONCEBYTES: number;
    crypto_secretbox_easy(
      message: Uint8Array,
      nonce: Uint8Array,
      key: Uint8Array
    ): Uint8Array;
    crypto_secretbox_open_easy(
      ciphertext: Uint8Array,
      nonce: Uint8Array,
      key: Uint8Array
    ): Uint8Array | null;
    crypto_secretstream_xchacha20poly1305_keygen(): Uint8Array;
    crypto_secretstream_xchacha20poly1305_init_push(key: Uint8Array): {
      state: any;
      header: Uint8Array;
    };
    crypto_secretstream_xchacha20poly1305_push(
      state: any,
      message: Uint8Array,
      ad: Uint8Array | null,
      tag: number
    ): Uint8Array;
    crypto_secretstream_xchacha20poly1305_init_pull(
      header: Uint8Array,
      key: Uint8Array
    ): any;
    crypto_secretstream_xchacha20poly1305_pull(
      state: any,
      ciphertext: Uint8Array,
      ad: Uint8Array | null
    ): { message: Uint8Array; tag: number };
    crypto_secretstream_xchacha20poly1305_TAG_MESSAGE: number;
    crypto_secretstream_xchacha20poly1305_TAG_FINAL: number;
    crypto_secretstream_xchacha20poly1305_TAG_PUSH: number;
    crypto_secretstream_xchacha20poly1305_TAG_REKEY: number;
    crypto_hash(message: Uint8Array): Uint8Array;
    crypto_hash_sha256(message: Uint8Array): Uint8Array;
    crypto_hash_sha512(message: Uint8Array): Uint8Array;
    crypto_kdf_derive_from_key(
      subkey_len: number,
      subkey_id: number,
      ctx: string,
      key: Uint8Array
    ): Uint8Array;
    memzero(buffer: Uint8Array): void;
    memcmp(a: Uint8Array, b: Uint8Array): number;
    crypto_pwhash(
      outLen: number,
      passwd: string | Uint8Array,
      salt: Uint8Array,
      opsLimit: number,
      memLimit: number,
      alg: number
    ): Uint8Array;
    crypto_pwhash_ALG_ARGON2ID13: number;
    crypto_pwhash_SALTBYTES: number;
    crypto_pwhash_OPSLIMIT_MIN: number;
    crypto_pwhash_OPSLIMIT_MODERATE: number;
    crypto_pwhash_OPSLIMIT_SENSITIVE: number;
    crypto_pwhash_MEMLIMIT_MIN: number;
    crypto_pwhash_MEMLIMIT_MODERATE: number;
    crypto_pwhash_MEMLIMIT_SENSITIVE: number;
  };

  export default sodium;
}
