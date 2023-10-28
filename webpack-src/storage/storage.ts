
import * as idb from './idb';
import { HmacSha256 } from '../crypto/sha256';
import { AesKey, AesMessage } from '../crypto/aes-gcm';


export type KeyValueStoreName = string;
export type KeyValueStoreKey = number | string;

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
        return await hmac.signStringBase64(JSON.stringify([storeName]));
    }

    public async getHashedStoreKey(storeName: KeyValueStoreName, key: KeyValueStoreKey): Promise<string> {
        const hmac = await this.#indexHmacKeyPromise;
        return await hmac.signStringBase64(JSON.stringify([storeName, key]));
    }
}

const IDB_NAME = 'alarkhabil_encrypted_storage';
const IDB_CURRENT_VERSION = idb.IdbVersion(1);

const IDB_MIGRATIONS = new idb.IdbUpgrader.MigrationRegistry();

IDB_MIGRATIONS.defineMigration(idb.IdbVersion(1), (db: IDBDatabase, version: idb.IdbVersion): void => {

});
