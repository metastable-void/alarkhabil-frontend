
import * as base64 from '../base64';
import * as utf8 from '../utf8';


const toHex = (bytes: Uint8Array): string => {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

export class Sha256 {
    public static async digest(message: Uint8Array): Promise<Uint8Array> {
        const hash = await crypto.subtle.digest('SHA-256', message);
        return new Uint8Array(hash);
    }

    public static async digestHex(message: Uint8Array): Promise<string> {
        const hash = await this.digest(message);
        return toHex(hash);
    }

    public static async digestBase64(message: Uint8Array): Promise<string> {
        const hash = await this.digest(message);
        return base64.encode(hash);
    }
}

Object.freeze(Sha256);

export class HmacSha256 {
    readonly #importedKeyPromise: Promise<CryptoKey>;

    public constructor(key: Uint8Array) {
        this.#importedKeyPromise = crypto.subtle.importKey(
            'raw',
            key,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign', 'verify'],
        );
    }

    public async signBytes(bytes: Uint8Array): Promise<Uint8Array> {
        const importedKey = await this.#importedKeyPromise;
        const signature = await crypto.subtle.sign(
            'HMAC',
            importedKey,
            bytes,
        );
        return new Uint8Array(signature);
    }

    public async signBytesHex(bytes: Uint8Array): Promise<string> {
        const signature = await this.signBytes(bytes);
        return toHex(signature);
    }

    public async signBytesBase64(bytes: Uint8Array): Promise<string> {
        const signature = await this.signBytes(bytes);
        return base64.encode(signature);
    }

    public async signString(str: string): Promise<Uint8Array> {
        const bytes = utf8.encode(str);
        return await this.signBytes(bytes);
    }

    public async signStringBase64(str: string): Promise<string> {
        const bytes = utf8.encode(str);
        return await this.signBytesBase64(bytes);
    }

    public async signDataBase64<T>(data: T): Promise<string> {
        const bytes = utf8.encode(JSON.stringify(data));
        return await this.signBytesBase64(bytes);
    }
}

Object.freeze(HmacSha256);
