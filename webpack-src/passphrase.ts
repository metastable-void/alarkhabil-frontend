
import * as utf8 from './utf8';
export const PBKDF2_ITERATIONS = 100000;
export const PBKDF2_KEY_LENGTH = 32;
export const PBKDF2_HASH_ALGO = 'SHA-512';

export const deriveKey = async (passphrase: string, salt: string): Promise<Uint8Array> => {
    const passphraseBytes = utf8.encode(passphrase);
    const saltBytes = utf8.encode(salt);
    const key = await crypto.subtle.importKey(
        'raw',
        passphraseBytes,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey'],
    );
    return new Uint8Array(await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: PBKDF2_ITERATIONS,
            hash: PBKDF2_HASH_ALGO,
        },
        key,
        PBKDF2_KEY_LENGTH * 8,
    ));
};
