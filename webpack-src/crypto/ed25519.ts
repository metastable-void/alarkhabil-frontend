
import * as ed from '@noble/ed25519';

import * as base64 from '../base64';
import * as utf8 from '../utf8';
import { SignedMessage } from './crypto';


Object.freeze(Uint8Array);
Object.freeze(Object.getPrototypeOf(Uint8Array)); // TypedArray
Object.freeze(Uint8Array.prototype);
Object.freeze(Object.getPrototypeOf(Uint8Array.prototype)); // TypedArray.prototype

export interface Ed25519SignedMessage extends SignedMessage {
    readonly algo: 'ed25519';
    readonly pubk: string; // base64
    readonly sig: string; // base64
    readonly msg: string; // base64
}

export namespace Ed25519SignedMessage {
    export const verify = async <T>(msg: Ed25519SignedMessage): Promise<T> => {
        const publicKey = PublicKey.fromBase64(msg.pubk);
        const signature = base64.decode(msg.sig);
        const bytes = base64.decode(msg.msg);
        if (!await ed.verifyAsync(signature, bytes, publicKey.getBytes())) {
            throw new Error('Invalid signature.');
        }
        const data = JSON.parse(utf8.decode(bytes));
        return data as T;
    };
}

/**
 * Private keys of ed25519 are any 32-byte good random numbers.
 */
export class PrivateKey {
    readonly #privateKey: Uint8Array;

    public constructor(bytes: Uint8Array) {
        if (!(bytes instanceof Uint8Array)) {
            throw new Error('Invalid private key type.');
        }
        if (bytes.length < 32) {
            throw new Error('Invalid private key length.');
        }
        this.#privateKey = bytes.slice(0, 32);
        Object.freeze(this);
    }

    public async getPublicKey(): Promise<PublicKey> {
        const publicKey = await ed.getPublicKeyAsync(this.#privateKey);
        return new PublicKey(publicKey);
    }

    async signBytes(bytes: Uint8Array): Promise<Ed25519SignedMessage> {
        const publicKey = await this.getPublicKey();
        const signature = await ed.signAsync(bytes, this.#privateKey);
        return {
            algo: 'ed25519',
            pubk: publicKey.toBase64(),
            sig: base64.encode(signature),
            msg: base64.encode(bytes),
        };
    }

    public async sign<T>(data: T): Promise<Ed25519SignedMessage> {
        const bytes = utf8.encode(JSON.stringify(data));
        return await this.signBytes(bytes);
    }
}

Object.freeze(PrivateKey);
Object.freeze(PrivateKey.prototype);

/**
 * Not every 32-byte array is a valid public key.
 */
export class PublicKey {
    readonly #publicKey: Uint8Array;

    public static fromBase64(encoded: string): PublicKey {
        return new PublicKey(base64.decode(encoded));
    }

    public constructor(bytes: Uint8Array) {
        if (!(bytes instanceof Uint8Array)) {
            throw new Error('Invalid public key type.');
        }
        if (bytes.length !== 32) {
            throw new Error('Invalid public key length.');
        }
        ed.ExtendedPoint.fromHex(bytes); // validate
        this.#publicKey = bytes.slice(0, 32);
        Object.freeze(this);
    }

    public getBytes(): Uint8Array {
        return this.#publicKey.slice(0);
    }

    public toBase64(): string {
        return base64.encode(this.#publicKey);
    }

    public toString(): string {
        return this.toBase64();
    }
}

Object.freeze(PublicKey);
Object.freeze(PublicKey.prototype);
