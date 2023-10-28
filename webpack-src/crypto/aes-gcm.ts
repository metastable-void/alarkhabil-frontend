
import * as utf8 from '../utf8';
import { Sha256 } from './sha256';

export interface AesMessage {
    readonly algo: 'aes-gcm';
    readonly iv: Uint8Array; // 12 bytes
    readonly msg: Uint8Array; // encrypted
}

/**
 * AES-GCM encryption and decryption. This object contains a secret key that is used for encryption and decryption.
 */
export class AesKey {
    readonly #key: CryptoKey;

    /**
     * The key ID is SHA-256 of the key in hex string.
     */
    public readonly keyId: string;

    public static async create(key: Uint8Array): Promise<AesKey> {
        if (key.length < 32) {
            throw new Error('Invalid key length.');
        }
        const trimmedKey = key.slice(0, 32);
        const digest = await Sha256.digestHex(trimmedKey);
        const importedKey = await crypto.subtle.importKey("raw", trimmedKey, "AES-GCM", false, [
            "encrypt",
            "decrypt",
        ]);
        return new AesKey(importedKey, digest);
    }

    private constructor(importedKey: CryptoKey, keyId: string) {
        if (!(importedKey instanceof CryptoKey)) {
            throw new Error('Invalid key type.');
        }
        if (importedKey.type !== 'secret') {
            throw new Error('Invalid key type.');
        }
        if (importedKey.algorithm.name !== 'AES-GCM') {
            throw new Error('Invalid key type.');
        }
        const algorithm = importedKey.algorithm as AesKeyAlgorithm;
        if (!importedKey.usages.includes('encrypt') || !importedKey.usages.includes('decrypt')) {
            throw new Error('Invalid key type.');
        }
        if (importedKey.extractable) {
            throw new Error('Invalid key type.');
        }
        if (algorithm.length !== 256) {
            throw new Error('Invalid key type.');
        }

        this.keyId = String(keyId);
        this.#key = importedKey;
        Object.freeze(this);
    }

    private async encryptBytes(bytes: Uint8Array): Promise<AesMessage> {
        if (!(bytes instanceof Uint8Array)) {
            throw new Error('Invalid bytes type.');
        }

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            this.#key,
            bytes,
        );

        return {
            algo: 'aes-gcm',
            iv,
            msg: new Uint8Array(encrypted),
        };
    }

    private async decryptBytes(msg: AesMessage): Promise<Uint8Array> {
        if (msg.algo !== 'aes-gcm') {
            throw new Error('Invalid message type.');
        }
        if (!(msg.iv instanceof Uint8Array)) {
            throw new Error('Invalid message type.');
        }
        if (!(msg.msg instanceof Uint8Array)) {
            throw new Error('Invalid message type.');
        }

        const decrypted = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: msg.iv,
            },
            this.#key,
            msg.msg,
        );
        return new Uint8Array(decrypted);
    }

    /**
     * Encrypts data.
     * @param data JSON-serializable data
     * @returns AesMessage. The message is encrypted with AES-GCM.
     */
    public async encrypt<T>(data: T): Promise<AesMessage> {
        const bytes = utf8.encode(JSON.stringify(data));
        return await this.encryptBytes(bytes);
    }

    /**
     * Decrypts data.
     * @param msg AesMessage. The message is encrypted with AES-GCM.
     * @returns JSON-serializable data
     */
    public async decrypt<T>(msg: AesMessage): Promise<T> {
        const bytes = await this.decryptBytes(msg);
        const json = utf8.decode(bytes);
        return JSON.parse(json);
    }
}
