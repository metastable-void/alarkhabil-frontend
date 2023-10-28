
import * as utf8 from './utf8';
import { PrivateKey } from './crypto/ed25519';
import { Uuid } from './uuid';


// PBKDF2 params
export const PBKDF2_ITERATIONS = 100000;
export const PBKDF2_KEY_LENGTH = 64;
export const PBKDF2_HASH_ALGO = 'SHA-512';

// HMAC params
export const HMAC_HASH_ALGO = 'SHA-512';

const deriveKeyFromPassphrase = async (passphrase: string, salt: string): Promise<Uint8Array> => {
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

const deriveKey = async (key: Uint8Array, keyName: string): Promise<Uint8Array> => {
    const msg = utf8.encode(keyName);
    const importedKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: HMAC_HASH_ALGO },
        false,
        ['sign', 'verify'],
    );
    const signature = await crypto.subtle.sign(
        'HMAC',
        importedKey,
        msg,
    );
    return new Uint8Array(signature);
};

export class PassphraseCredential {
    public static readonly KEY_USE_BACKEND_AUTH = 'backend_auth';
    public static readonly KEY_USE_LOCAL_ENCRYPTION = 'local_encryption';

    readonly #primaryKeyPromise: Promise<Uint8Array>;

    public constructor(uuidStr: string, passphrase: string) {
        const uuid = Uuid(uuidStr);
        this.#primaryKeyPromise = deriveKeyFromPassphrase(passphrase, uuid);
        Object.freeze(this);
    }

    async #getDerivedKey(keyName: string, keyIndex: number): Promise<Uint8Array> {
        const keyIndexInt = keyIndex >>> 0;
        const primaryKey = await this.#primaryKeyPromise;
        const key = await deriveKey(primaryKey, `${keyName}_${keyIndexInt}`);
        return key;
    }

    public async getBackendAuthPrivateKey(keyIndex = 0): Promise<PrivateKey> {
        const key = await this.#getDerivedKey(PassphraseCredential.KEY_USE_BACKEND_AUTH, keyIndex);
        return new PrivateKey(key);
    }
}

Object.freeze(PassphraseCredential);
Object.freeze(PassphraseCredential.prototype);
