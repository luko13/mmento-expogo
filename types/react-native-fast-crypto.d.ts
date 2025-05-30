// types/react-native-fast-crypto.d.ts
declare module 'react-native-fast-crypto' {
  export class NativeCrypto {
    crypto_secretbox_easy(message: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array;
    crypto_secretbox_open_easy(ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array | null;
    randombytes_buf(length: number): Uint8Array;
    crypto_pwhash(
      keyLength: number,
      password: string | Uint8Array,
      salt: Uint8Array,
      opsLimit: number,
      memLimit: number,
      algorithm: number
    ): Uint8Array;
  }
}