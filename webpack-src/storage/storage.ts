
import * as idb from './idb';


const IDB_NAME = 'alarkhabil_encrypted_storage';
const IDB_CURRENT_VERSION = idb.IdbVersion(1);

const IDB_MIGRATIONS = new idb.IdbUpgrader.MigrationRegistry();

IDB_MIGRATIONS.defineMigration(idb.IdbVersion(1), (db: IDBDatabase, version: idb.IdbVersion): void => {

});
