
import { EventSink } from 'weeg-events';

import * as idb from './idb';
import * as utf8 from '../utf8';
import { HmacSha256 } from '../crypto/sha256';
import { AesKey, AesMessage } from '../crypto/aes-gcm';


export type KeyValueStoreName = string;
export namespace KeyValueStoreName {
    export const validate = (storeName: unknown): storeName is KeyValueStoreName => {
        return typeof storeName === 'string';
    };
}

export type KeyValueStoreKey = number | string;
export namespace KeyValueStoreKey {
    export const validate = (key: unknown): key is KeyValueStoreKey => {
        return typeof key === 'number' || typeof key === 'string';
    };
}

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
            new DataView(data.buffer).setFloat64(0, value, false);
        } else if (typeof value == 'string') {
            type[0] = TYPE_STRING;
            const bytes = utf8.encode(value);
            const length = new Uint8Array(4);
            new DataView(length.buffer).setUint32(0, bytes.length, false);
            data = concat(length, bytes);
        } else {
            throw new Error('Invalid value type.');
        }
        return concat(type, data);
    };

    export const encodeTuple = (values: Value[]): Uint8Array => {
        const length = new Uint8Array(4);
        new DataView(length.buffer).setUint32(0, values.length, false);
        let result = length;
        for (const value of values) {
            result = concat(result, encodeSingleValue(value));
        }
        return result;
    };
}

interface EncryptedStorageItem {
    readonly encryptionKeyId: string;
    readonly hashedStoreName: string;
    readonly hashedStoreKey: string;
    readonly data: AesMessage;
}

const STORAGE_ENCRYPTION_KEY_ACCESS_TOKEN: unique symbol = Symbol('STORAGE_ENCRYPTION_KEY_ACCESS_TOKEN');
export type StorageEncryptionKeyAccessToken = typeof STORAGE_ENCRYPTION_KEY_ACCESS_TOKEN;

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

    public async getEncryptionKeyId(): Promise<string> {
        return await this.#keyIdPromise;
    }

    public async encryptData<T>(token: StorageEncryptionKeyAccessToken, data: T): Promise<AesMessage> {
        if (token !== STORAGE_ENCRYPTION_KEY_ACCESS_TOKEN) {
            throw new Error('Invalid token.');
        }
        const aesKey = await this.#aesKeyPromise;
        return await aesKey.encrypt<T>(data);
    }

    public async decryptData<T>(token: StorageEncryptionKeyAccessToken, msg: AesMessage): Promise<T> {
        if (token !== STORAGE_ENCRYPTION_KEY_ACCESS_TOKEN) {
            throw new Error('Invalid token.');
        }
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

Object.freeze(StorageEncryptionKey);
Object.freeze(StorageEncryptionKey.prototype);

const IDB_NAME = 'alarkhabil_encrypted_storage';
const IDB_CURRENT_VERSION = idb.IdbVersion(1);

const IDB_MIGRATIONS = new idb.IdbUpgrader.MigrationRegistry();

IDB_MIGRATIONS.defineMigration(idb.IdbVersion(1), (db: IDBDatabase, version: idb.IdbVersion): void => {
    const objStore = db.createObjectStore("encryptedStorageItems", { autoIncrement: true });
    objStore.createIndex('encryptionKeyId', 'encryptionKeyId', { unique: false });
    objStore.createIndex('hashedStoreName', 'hashedStoreName', { unique: false });
    objStore.createIndex('hashedStoreKey', 'hashedStoreKey', { unique: true });

    // compound indexes
    objStore.createIndex('encryptionKeyId,hashedStoreName', ['encryptionKeyId', 'hashedStoreName'], { unique: false });
    objStore.createIndex('encryptionKeyId,hashedStoreKey', ['encryptionKeyId', 'hashedStoreKey'], { unique: true });
});

const IDB_UPGRADER = IDB_MIGRATIONS.getUpgrader();

class SingletonConnection {
    public static get instance(): SingletonConnection {
        return this.#instance;
    }

    static readonly #instance = new SingletonConnection();

    readonly #connectionPromise: Promise<idb.Connection>;

    private constructor() {
        const builder = new idb.ConnectionBuilder(IDB_NAME, IDB_CURRENT_VERSION, IDB_UPGRADER);
        this.#connectionPromise = builder.connect();
        Object.freeze(this);
    }

    public async getIdbConnection(): Promise<idb.Connection> {
        const connection = await this.#connectionPromise;
        if (connection.state != idb.Connection.STATE_OPEN) {
            throw new Error('Connection is not open.');
        }
        return connection;
    }
}

Object.freeze(SingletonConnection);
Object.freeze(SingletonConnection.prototype);

interface KeyValueStoreInternalValue<T> {
    readonly storeName: KeyValueStoreName;
    readonly key: KeyValueStoreKey;
    readonly value: T;
}

const broadcastChannel = new BroadcastChannel('alarkhabil-storage');

export interface DeletedValueNotification {
    readonly type: 'deleted';
    readonly storeName: KeyValueStoreName;
    readonly key: KeyValueStoreKey;
}

export interface UpdatedValueNotification<T> {
    readonly type: 'updated';
    readonly storeName: KeyValueStoreName;
    readonly key: KeyValueStoreKey;
    readonly value: T;
}

export interface ClearedStoreNotification {
    readonly type: 'cleared';
    readonly storeName: KeyValueStoreName;
}

export type StoreUpdateNotification<T> = DeletedValueNotification | UpdatedValueNotification<T> | ClearedStoreNotification;

interface EncryptedStoreUpdateNotification {
    readonly encryptionKeyId: string;
    readonly data: AesMessage; // contains StoreUpdateNotification
}

export class KeyValueStore<T> {
    readonly #storeName: KeyValueStoreName;
    readonly #encryptionKey: StorageEncryptionKey;
    readonly #hashedStoreNamePromise: Promise<string>;
    readonly #encryptionKeyIdPromise: Promise<string>;

    readonly onUpdated = new EventSink<UpdatedValueNotification<T>>();
    readonly onDeleted = new EventSink<DeletedValueNotification>();
    readonly onCleared = new EventSink<ClearedStoreNotification>(); 

    public constructor(storeName: KeyValueStoreName, encryptionKey: StorageEncryptionKey) {
        if (!KeyValueStoreName.validate(storeName)) {
            throw new Error('Invalid store name.');
        }
        if (!(encryptionKey instanceof StorageEncryptionKey)) {
            throw new Error('Invalid encryption key.');
        }
        this.#storeName = storeName;
        this.#encryptionKey = encryptionKey;
        this.#hashedStoreNamePromise = encryptionKey.getHashedStoreName(storeName);
        this.#encryptionKeyIdPromise = encryptionKey.getEncryptionKeyId();
        Object.freeze(this);

        broadcastChannel.addEventListener('message', async (event: MessageEvent<EncryptedStoreUpdateNotification>) => {
            const message = event.data;
            const encryptionKeyId = await this.#encryptionKeyIdPromise;
            if (message.encryptionKeyId !== encryptionKeyId) {
                return;
            }
            const notification = await this.#encryptionKey.decryptData<StoreUpdateNotification<T>>(STORAGE_ENCRYPTION_KEY_ACCESS_TOKEN, message.data);
            switch (notification.type) {
                case 'deleted':
                    if (notification.storeName === this.#storeName) {
                        this.onDeleted.dispatch(notification);
                    }
                    break;
                case 'updated':
                    if (notification.storeName === this.#storeName) {
                        this.onUpdated.dispatch(notification);
                    }
                    break;
                case 'cleared':
                    if (notification.storeName === this.#storeName) {
                        this.onCleared.dispatch(notification);
                    }
                    break;
            }
        });
    }

    private notifyChanges(notification: StoreUpdateNotification<T>) {
        (async () => {
            const encryptedNotification = await this.#encryptionKey.encryptData(STORAGE_ENCRYPTION_KEY_ACCESS_TOKEN, notification);
            const message: EncryptedStoreUpdateNotification = {
                encryptionKeyId: await this.#encryptionKeyIdPromise,
                data: encryptedNotification,
            };
            broadcastChannel.postMessage(message);
        })().catch(e => {
            console.error(e);
        });
    }

    public async count(): Promise<number> {
        const connection = await SingletonConnection.instance.getIdbConnection();
        const transaction = connection.transaction('encryptedStorageItems', 'readonly');
        const store = transaction.objectStore('encryptedStorageItems');
        const hashedStoreName = await this.#hashedStoreNamePromise;
        const encryptionKeyId = await this.#encryptionKeyIdPromise;
        const index = store.index('encryptionKeyId,hashedStoreName');
        const request = index.count([encryptionKeyId, hashedStoreName]);
        return await new Promise<number>((resolve, reject) => {
            request.onsuccess = (event: Event) => {
                resolve(request.result);
            };
            request.onerror = (event: Event) => {
                reject(event);
            };
        });
    }

    public async clear(): Promise<void> {
        const connection = await SingletonConnection.instance.getIdbConnection();
        const transaction = connection.transaction('encryptedStorageItems', 'readwrite');
        const store = transaction.objectStore('encryptedStorageItems');
        const hashedStoreName = await this.#hashedStoreNamePromise;
        const encryptionKeyId = await this.#encryptionKeyIdPromise;
        const index = store.index('encryptionKeyId,hashedStoreName');
        const request = index.openCursor([encryptionKeyId, hashedStoreName]);
        return await new Promise<void>((resolve, reject) => {
            request.onsuccess = (_event: Event) => {
                const promises: Promise<void>[] = [];
                const cursor = request.result;
                if (cursor) {
                    const deleteRequest = cursor.delete();
                    promises.push(new Promise<void>((resolve, reject) => {
                        deleteRequest.onsuccess = (_event: Event) => {
                            resolve();
                        };
                        deleteRequest.onerror = (event: Event) => {
                            reject(event);
                        };
                    }));
                    cursor.continue();
                } else {
                    Promise.all(promises).then(() => {
                        this.notifyChanges({
                            type: 'cleared',
                            storeName: this.#storeName,
                        });
                        resolve();
                    }).catch((reason) => {
                        reject(reason);
                    });
                }
            };
            request.onerror = (event: Event) => {
                reject(event);
            };
        });
    }

    public async getAllKeys(): Promise<KeyValueStoreKey[]> {
        const connection = await SingletonConnection.instance.getIdbConnection();
        const transaction = connection.transaction('encryptedStorageItems', 'readwrite');
        const store = transaction.objectStore('encryptedStorageItems');
        const hashedStoreName = await this.#hashedStoreNamePromise;
        const encryptionKeyId = await this.#encryptionKeyIdPromise;
        const index = store.index('encryptionKeyId,hashedStoreName');
        const request = index.getAll([encryptionKeyId, hashedStoreName]);
        return await new Promise<KeyValueStoreKey[]>((resolve, reject) => {
            request.onsuccess = (_event: Event) => {
                const items = request.result as EncryptedStorageItem[];
                const decryptionPromises = items.map((item) => {
                    return this.#encryptionKey.decryptData<KeyValueStoreInternalValue<T>>(STORAGE_ENCRYPTION_KEY_ACCESS_TOKEN, item.data);
                });
                Promise.all(decryptionPromises).then((decryptedItems) => {
                    resolve(decryptedItems.map((item) => item.key));
                }).catch((e) => reject(e));
            };
            request.onerror = (event: Event) => {
                reject(event);
            };
        });
    }

    public async delete(key: KeyValueStoreKey): Promise<void> {
        const encryptionKeyId = await this.#encryptionKeyIdPromise;
        const hashedStoreKey = await this.#encryptionKey.getHashedStoreKey(this.#storeName, key);

        const connection = await SingletonConnection.instance.getIdbConnection();
        const transaction = connection.transaction('encryptedStorageItems', 'readwrite');
        const store = transaction.objectStore('encryptedStorageItems');
        const index = store.index('encryptionKeyId,hashedStoreKey');
        const request = index.openCursor([encryptionKeyId, hashedStoreKey]);
        return await new Promise<void>((resolve, reject) => {
            request.onsuccess = (_event: Event) => {
                const cursor = request.result;
                if (cursor) {
                    const deleteRequest = cursor.delete();
                    deleteRequest.onsuccess = (_event: Event) => {
                        this.notifyChanges({
                            type: 'deleted',
                            storeName: this.#storeName,
                            key: key,
                        });
                        resolve();
                    };
                    deleteRequest.onerror = (event: Event) => {
                        reject(event);
                    };
                } else {
                    resolve();
                }
            };
            request.onerror = (event: Event) => {
                reject(event);
            };
        });
    }

    private async getInternal(key: KeyValueStoreKey): Promise<KeyValueStoreInternalValue<T> | null> {
        if (!KeyValueStoreKey.validate(key)) {
            throw new Error('Invalid key.');
        }
        const encryptionKeyId = await this.#encryptionKeyIdPromise;
        const hashedStoreKey = await this.#encryptionKey.getHashedStoreKey(this.#storeName, key);

        const connection = await SingletonConnection.instance.getIdbConnection();
        const transaction = connection.transaction('encryptedStorageItems', 'readonly');
        const store = transaction.objectStore('encryptedStorageItems');
        const index = store.index('encryptionKeyId,hashedStoreKey');
        const request = index.openCursor([encryptionKeyId, hashedStoreKey]);
        return await new Promise<KeyValueStoreInternalValue<T> | null>((resolve, reject) => {
            request.onsuccess = (_event: Event) => {
                const cursor = request.result;
                if (cursor) {
                    const item = cursor.value as EncryptedStorageItem;
                    this.#encryptionKey.decryptData(STORAGE_ENCRYPTION_KEY_ACCESS_TOKEN, item.data).then((data) => {
                        resolve(data as KeyValueStoreInternalValue<T>);
                    }).catch((reason) => {
                        reject(reason);
                    });
                } else {
                    resolve(null);
                }
            };
            request.onerror = (event: Event) => {
                reject(event);
            };
        });
    }

    public async get(key: KeyValueStoreKey): Promise<T | null> {
        const item = await this.getInternal(key);
        if (item === null) {
            return null;
        }
        console.assert(item.storeName === this.#storeName);
        console.assert(item.key === key);
        return item.value;
    }

    public async set(key: KeyValueStoreKey, value: T): Promise<void> {
        const internalValue: KeyValueStoreInternalValue<T> = {
            storeName: this.#storeName,
            key: key,
            value: value,
        };
        const encryptionKeyId = await this.#encryptionKeyIdPromise;
        const hashedStoreName = await this.#hashedStoreNamePromise;
        const hashedStoreKey = await this.#encryptionKey.getHashedStoreKey(this.#storeName, key);
        const encryptedData = await this.#encryptionKey.encryptData(STORAGE_ENCRYPTION_KEY_ACCESS_TOKEN, internalValue);

        const encryptedStorageItem: EncryptedStorageItem = {
            encryptionKeyId,
            hashedStoreName,
            hashedStoreKey,
            data: encryptedData,
        };

        const connection = await SingletonConnection.instance.getIdbConnection();
        const transaction = connection.transaction('encryptedStorageItems', 'readwrite');
        const store = transaction.objectStore('encryptedStorageItems');
        const request = store.put(encryptedStorageItem);
        return await new Promise<void>((resolve, reject) => {
            request.onsuccess = (_event: Event) => {
                this.notifyChanges({
                    type: 'updated',
                    storeName: this.#storeName,
                    key: key,
                    value: value,
                });
                resolve();
            };
            request.onerror = (event: Event) => {
                reject(event);
            };
        });
    }
}

Object.freeze(KeyValueStore);
Object.freeze(KeyValueStore.prototype);

export class EncryptedStorage {
    readonly #encryptionKey: StorageEncryptionKey;

    public constructor(encryptionKey: StorageEncryptionKey) {
        if (!(encryptionKey instanceof StorageEncryptionKey)) {
            throw new Error('Invalid encryption key.');
        }
        this.#encryptionKey = encryptionKey;
        Object.freeze(this);
    }

    public getKeyValueStore<T>(storeName: KeyValueStoreName): KeyValueStore<T> {
        return new KeyValueStore<T>(storeName, this.#encryptionKey);
    }
}

Object.freeze(EncryptedStorage);
Object.freeze(EncryptedStorage.prototype);
