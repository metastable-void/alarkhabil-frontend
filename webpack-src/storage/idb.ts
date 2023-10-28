
declare const IDBVERSION: unique symbol;
export type IdbVersion = number & { [IDBVERSION]: never };

export function IdbVersion(version: number): IdbVersion {
    if (new.target != null) {
        throw new Error('IdbVersion is not a constructor.');
    }
    if (!Object.is(version, version >>> 0)) {
        throw new Error('Invalid version.');
    }
    return version as IdbVersion;
}

export namespace IdbVersion {
    export const INITIAL = IdbVersion(0);
    
    export const isIdbVersion = (value: unknown): value is IdbVersion => {
        return typeof value === 'number' && Object.is(value, value >>> 0);
    };

    export const increment = (version: IdbVersion): IdbVersion => {
        return IdbVersion(version + 1);
    };

    export const max = (a: IdbVersion, b: IdbVersion): IdbVersion => {
        return IdbVersion(Math.max(a, b));
    };

    export const min = (a: IdbVersion, b: IdbVersion): IdbVersion => {
        return IdbVersion(Math.min(a, b));
    };
}

/**
 * This is a synchronous callback. It is called when the database is created or upgraded.
 * It should only do data schema migration.
 */
export type IdbMigrator = (db: IDBDatabase, newVersion: IdbVersion) => void;

export class IdbUpgrader {
    static #cloneMap<K, V>(map: Map<K, V>): Map<K, V> {
        const newMap = new Map<K, V>();
        for (const [k, v] of map) {
            newMap.set(k, v);
        }
        return newMap;
    }

    // static inner class
    public static readonly MigrationRegistry = class MigrationRegistry {
        readonly #registry: Map<IdbVersion, IdbMigrator> = new Map();
        #maxVersion: IdbVersion = IdbVersion.INITIAL;
    
        /**
         * Define a migration to upgrade the database into the version.
         * @param version 
         * @param upgrader 
         */
        public defineMigration(version: IdbVersion, upgrader: IdbMigrator): void {
            if (version === IdbVersion.INITIAL) {
                throw new Error('Cannot define migration for initial version.');
            }
            if (this.#registry.has(version)) {
                throw new Error('Migration already defined.');
            }
            this.#registry.set(version, upgrader);
            this.#maxVersion = IdbVersion.max(this.#maxVersion, version);
        }

        public getUpgrader(): IdbUpgrader {
            const migrations = IdbUpgrader.#cloneMap(this.#registry);
            const maxVersion = this.#maxVersion;
    
            const callback: IdbUpgrader.UpgradeCallback = (db: IDBDatabase, oldVersion: IdbVersion, newVersion: IdbVersion): void => {
                if (!migrations.has(newVersion)) {
                    throw new Error('Migration not defined.');
                }
        
                if (oldVersion > newVersion) {
                    throw new Error('Invalid migration.');
                }
        
                if (oldVersion === newVersion) {
                    return;
                }
        
                for (let v = IdbVersion.increment(oldVersion); v <= newVersion; v = IdbVersion.increment(v)) {
                    const upgrader = migrations.get(v);
                    if (!upgrader) {
                        throw new Error('Migration not defined.');
                    }
                    upgrader(db, v);
                }
            };

            return new IdbUpgrader(callback, maxVersion);
        }
    };

    readonly #callback: IdbUpgrader.UpgradeCallback;
    readonly #maxVersion: IdbVersion;

    private constructor(callback: IdbUpgrader.UpgradeCallback, maxVersion: IdbVersion) {
        this.#callback = callback;
        this.#maxVersion = maxVersion;
    }
    
    public get maxVersion(): IdbVersion {
        return this.#maxVersion;
    }

    public get callback(): IdbUpgrader.UpgradeCallback {
        return this.#callback;
    }
}

export namespace IdbUpgrader {
    export type UpgradeCallback = (db: IDBDatabase, oldVersion: IdbVersion, newVersion: IdbVersion) => void;
    export type MigrationRegistry = InstanceType<typeof IdbUpgrader.MigrationRegistry>;
}

export class ConnectionBuilder {
    readonly #dbName: string;
    readonly #targetVersion: IdbVersion;
    readonly #upgrader: IdbUpgrader;

    public static deleteDatabase(dbName: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(dbName);
            request.onerror = (event: Event) => {
                reject(event);
            };
            request.onsuccess = (event: Event) => {
                resolve();
            };
        });
    }

    public constructor(dbName: string, targetVersion: IdbVersion, upgrader: IdbUpgrader) {
        IdbVersion(targetVersion); // validate version
        if (!(upgrader instanceof IdbUpgrader)) {
            throw new Error('Invalid upgrader.');
        }
        if (targetVersion !== upgrader.maxVersion) {
            throw new Error('Invalid upgrader.');
        }

        this.#dbName = String(dbName);
        this.#targetVersion = targetVersion;
        this.#upgrader = upgrader;
    }

    public async connect(onblocked?: () => void): Promise<Connection> {
        return new Promise<Connection>((resolve, reject) => {
            const dbOpenRequest = indexedDB.open(this.#dbName, this.#targetVersion);

            dbOpenRequest.onblocked = (event: Event) => {
                console.info('Database blocked.', event);
                if ('function' == typeof onblocked) {
                    onblocked();
                }
            };

            dbOpenRequest.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = dbOpenRequest.result;
                const oldVersion = IdbVersion(event.oldVersion);
                const newVersion = IdbVersion(event.newVersion ?? event.oldVersion);
                this.#upgrader.callback(db, oldVersion, newVersion);
            };

            dbOpenRequest.onerror = (event: Event) => {
                reject(event);
            };

            dbOpenRequest.onsuccess = (event: Event) => {
                console.debug('Database opened.', event);
                const db = dbOpenRequest.result;
                resolve(new Connection(db));
            };
        });
    }
}

/**
 * Connection to an IndexedDB database.
 */
export class Connection extends EventTarget {
    // connection states
    public static readonly STATE_OPEN = 'open';
    public static readonly STATE_CLOSING = 'closing';
    public static readonly STATE_CLOSED = 'closed';

    // transaction modes
    public static readonly TRANSACTION_MODE_READ_ONLY = 'readonly';
    public static readonly TRANSACTION_MODE_READ_WRITE = 'readwrite';

    readonly #db: IDBDatabase;
    #state: Connection.State = Connection.STATE_OPEN;

    public constructor(db: IDBDatabase) {
        super();
        this.#db = db;

        db.addEventListener('close', () => {
            this.#state = Connection.STATE_CLOSED;
            this.dispatchEvent(new Event('close'));
        });

        db.addEventListener('versionchange', () => {
            this.close();
        });
    }

    public get databaseName(): string {
        return this.#db.name;
    }

    public get databaseVersion(): IdbVersion {
        return IdbVersion(this.#db.version);
    }

    public get objectStoreNames(): string[] {
        return Array.from(this.#db.objectStoreNames);
    }

    public get state(): Connection.State {
        return this.#state;
    }

    public close(): void {
        if (this.#state === Connection.STATE_CLOSED || this.#state === Connection.STATE_CLOSING) {
            return;
        }
        this.#state = Connection.STATE_CLOSING;
        this.#db.close();
    }

    public transaction(storeNames: string | string[], mode: Connection.TransactionMode = Connection.TRANSACTION_MODE_READ_ONLY): IDBTransaction {
        if (this.#state !== Connection.STATE_OPEN) {
            throw new Error('Connection is not open.');
        }
        return this.#db.transaction(storeNames, mode);
    }
}

export namespace Connection {
    export type State = typeof Connection.STATE_OPEN | typeof Connection.STATE_CLOSING | typeof Connection.STATE_CLOSED;
    export type TransactionMode = typeof Connection.TRANSACTION_MODE_READ_ONLY | typeof Connection.TRANSACTION_MODE_READ_WRITE;
}
