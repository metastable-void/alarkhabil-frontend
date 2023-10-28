
import * as idb from './idb';
import * as utf8 from '../utf8';
import { HmacSha256 } from '../crypto/sha256';
import { AesKey, AesMessage } from '../crypto/aes-gcm';


export type KeyValueStoreName = string;
export type KeyValueStoreKey = number | string;

namespace TupleEncoder {
    export type Value = string | number;

    const TYPE_STRING = 1;
    const TYPE_NUMBER = 2;

    const concat = (a: Uint8Array, b: Uint8Array): Uint8Array => {
        const result = new Uint8Array(a.length + b.length);
        result.set(a);
        result.set(b, a.length);
        return result;
    };

    const encodeSingleValue = (value: Value): Uint8Array => {
        const type = new Uint8Array(1);
        let data: Uint8Array;
        if (typeof value == 'number') {
            type[0] = TYPE_NUMBER;
            data = new Uint8Array(8);
            new DataView(data.buffer).setFloat64(0, value);
        } else if (typeof value == 'string') {
            type[0] = TYPE_STRING;
            const bytes = utf8.encode(value);
            const length = new Uint8Array(4);
            new DataView(length.buffer).setUint32(0, bytes.length);
            data = concat(length, bytes);
        } else {
            throw new Error('Invalid value type.');
        }
        return concat(type, data);
    };

    export const encodeTuple = (values: Value[]): Uint8Array => {
        const length = new Uint8Array(4);
        new DataView(length.buffer).setUint32(0, values.length);
        let result = length;
        for (const value of values) {
            result = concat(result, encodeSingleValue(value));
        }
        return result;
    };
}

export class StorageEncryptionKey {
    readonly #keyIdPromise: Promise<string>;
    readonly #aesKeyPromise: Promise<AesKey>;
    readonly #indexHmacKeyPromise: Promise<HmacSha256>;

    public constructor(keyMaterial: Uint8Array) {
        const hmac = new HmacSha256(keyMaterial);

        this.#keyIdPromise = hmac.signStringBase64('storage-encryption-key-id');
        this.#aesKeyPromise = hmac.signString('storage-encryption-key').then((bytes) => AesKey.create(bytes));
        this.#indexHmacKeyPromise = hmac.signString('storage-encryption-index-hmac').then((bytes) => new HmacSha256(bytes));

        Object.freeze(this);
    }

    public async getKeyId(): Promise<string> {
        return await this.#keyIdPromise;
    }

    public async encryptData<T>(data: T): Promise<AesMessage> {
        const aesKey = await this.#aesKeyPromise;
        return await aesKey.encrypt<T>(data);
    }

    public async decryptData<T>(msg: AesMessage): Promise<T> {
        const aesKey = await this.#aesKeyPromise;
        return await aesKey.decrypt<T>(msg);
    }

    public async getHashedStoreName(storeName: KeyValueStoreName): Promise<string> {
        const hmac = await this.#indexHmacKeyPromise;
        return await hmac.signBytesBase64(TupleEncoder.encodeTuple([storeName]));
    }

    public async getHashedStoreKey(storeName: KeyValueStoreName, key: KeyValueStoreKey): Promise<string> {
        const hmac = await this.#indexHmacKeyPromise;
        return await hmac.signBytesBase64(TupleEncoder.encodeTuple([storeName, key]));
    }
}

const IDB_NAME = 'alarkhabil_encrypted_storage';
const IDB_CURRENT_VERSION = idb.IdbVersion(1);

const IDB_MIGRATIONS = new idb.IdbUpgrader.MigrationRegistry();

IDB_MIGRATIONS.defineMigration(idb.IdbVersion(1), (db: IDBDatabase, version: idb.IdbVersion): void => {

});
