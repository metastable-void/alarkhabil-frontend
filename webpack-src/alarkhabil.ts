
import { SiteConfig } from "./site-config";
import { FrontendApi } from "./frontend-api";
import { BackendApi } from "./backend-api";
import { deepFreeze } from "./freeze";
import { PassphraseCredential } from "./passphrase";
import { Uuid } from "./uuid";
import { EncryptedStorage } from "./storage/storage";
import { InviteToken } from "./invite-token";
import { PageMetadata } from "./page-metadata";
import * as ed25519 from './crypto/ed25519';


/**
 * State of the singleton instance of Alarkhabil.
 */
interface SingletonState {
    siteConfig: SiteConfig;
    authToken: symbol;
    credential: PassphraseCredential | undefined;
    encryptedStorage: EncryptedStorage | undefined;
}

/**
 * Credentials are not saved on storage on purpose. Page reload will sign out the user.
 */
export class Alarkhabil {
    /**
     * Token used to update backend API URL.
     */
    static readonly #BACKEND_API_UPDATE_TOKEN: unique symbol = Symbol('BACKEND_API_UPDATE_TOKEN');

    static #instance: Alarkhabil | undefined;

    readonly #state: SingletonState;

    public readonly frontendApi: FrontendApi;
    public readonly backendApi: BackendApi;

    public readonly pageMetadata = PageMetadata;

    public constructor() {
        if (new.target !== Alarkhabil) {
            throw new Error('Alarkhabil is a singleton class.');
        }

        // BEGIN Singleton initialization
        this.#state = {
            siteConfig: SiteConfig.INITIAL,
            authToken: this.#generateAuthToken(),
            credential: undefined,
            encryptedStorage: undefined,
        };
        this.frontendApi = new FrontendApi();
        this.backendApi = new BackendApi(this.#state.siteConfig.api_url, Alarkhabil.#BACKEND_API_UPDATE_TOKEN);
        // END Singleton initialization

        if (Alarkhabil.#instance) {
            return Alarkhabil.#instance;
        }

        Alarkhabil.#instance = this;
        Object.freeze(Alarkhabil);
        Object.freeze(Alarkhabil.prototype);
        Object.freeze(this);
    }

    public get siteConfig(): SiteConfig {
        return this.#state.siteConfig;
    }

    #handleSiteConfigChange(newConfig: SiteConfig) {
        // TODO: Handle site config change
        this.backendApi.updateUrl(newConfig.api_url, Alarkhabil.#BACKEND_API_UPDATE_TOKEN);
    }

    public async fetchSiteConfig(): Promise<SiteConfig> {
        try {
            const config = deepFreeze(await this.frontendApi.getConfig());
            this.#state.siteConfig = config;
            this.#handleSiteConfigChange(config);
            return config;
        } catch (e) {
            console.error(e);
            return this.#state.siteConfig;
        }
    }

    public async updateSiteConfig(): Promise<void> {
        await this.fetchSiteConfig();
    }

    createPassphraseCredential(uuid: string, passphrase: string): PassphraseCredential {
        if (passphrase.length < 12) {
            throw new Error('Passphrase too short.');
        }
        return new PassphraseCredential(uuid, passphrase);
    }

    public parseInviteToken(token: string): InviteToken {
        return new InviteToken(token);
    }

    #generateAuthToken(): symbol {
        const now = Date.now();
        return Symbol(`AUTH_TOKEN_${now}`);
    }

    public async getAuthorKey(backendApiToken: symbol, authToken: symbol): Promise<ed25519.PrivateKey> {
        if (backendApiToken !== Alarkhabil.#BACKEND_API_UPDATE_TOKEN) {
            throw new Error('Invalid backend API token.');
        }
        if (authToken !== this.#state.authToken) {
            throw new Error('Invalid auth token.');
        }
        if (!this.#state.credential) {
            throw new Error('Not signed in.');
        }
        return this.#state.credential.getBackendAuthPrivateKey();
    }

    /**
     * Sign in with a passphrase.
     * @param uuid UUID of the user
     * @param passphrase passphrase of the user
     * @returns a temporary auth token symbol, to avoid bringing the credential around.
     */
    public async signIn(uuid: string, passphrase: string): Promise<symbol> {
        const credential = this.createPassphraseCredential(uuid, passphrase);
        const privateKey = await credential.getBackendAuthPrivateKey();
        const storageEncryptionKey = await credential.getStorageEncryptionKey();
        await this.backendApi.account.checkCredentials(privateKey);
        this.#state.credential = credential;
        this.#state.authToken = this.#generateAuthToken();
        this.#state.encryptedStorage = new EncryptedStorage(storageEncryptionKey);
        console.info(`Signed in as ${uuid}.`);
        return this.#state.authToken;
    }

    public async signUp(parsedInviteToken: InviteToken, passphrase: string, name: string): Promise<symbol> {
        const credential = this.createPassphraseCredential(parsedInviteToken.uuid, passphrase);
        const privateKey = await credential.getBackendAuthPrivateKey();
        const storageEncryptionKey = await credential.getStorageEncryptionKey();
        await this.backendApi.account.createNew(privateKey, parsedInviteToken, name);
        this.#state.credential = credential;
        this.#state.authToken = this.#generateAuthToken();
        this.#state.encryptedStorage = new EncryptedStorage(storageEncryptionKey);
        console.info(`Signed up as ${parsedInviteToken.uuid}.`);
        return this.#state.authToken;
    }

    /**
     * Sign out and clear the credential.
     */
    public signOut(): void {
        this.#state.credential = undefined;
        this.#state.authToken = this.#generateAuthToken();
        this.#state.encryptedStorage = undefined;
        console.info('Signed out.');
    }

    /**
     * Convenience method to sign out and reload the page.
     * TODO: Redirect to the sign-in page.
     */
    public signOutAndReload(): void {
        this.signOut();
        window.location.reload();
    }

    public get isSignedIn(): boolean {
        return this.#state.credential !== undefined;
    }

    public get accountUuid(): Uuid | undefined {
        return this.#state.credential?.uuid;
    }

    public async changePassphrase(authToken: symbol, oldPassphrase: string, newPassphrase: string): Promise<void> {
        if (authToken !== this.#state.authToken) {
            throw new Error('Invalid auth token.');
        }

        const uuid = this.accountUuid;
        if (!uuid || !this.#state.credential) {
            throw new Error('Not signed in.');
        }
        const savedKeyId = await this.#state.credential.getKeyId();
        const oldCredential = this.createPassphraseCredential(uuid, oldPassphrase);
        const oldKeyId = await oldCredential.getKeyId();
        if (savedKeyId !== oldKeyId) {
            throw new Error('Incorrect old passphrase.');
        }

        const oldPrivateKey = await oldCredential.getBackendAuthPrivateKey();
        const newCredential = this.createPassphraseCredential(uuid, newPassphrase);
        const newPrivateKey = await newCredential.getBackendAuthPrivateKey();
        const newStorageEncryptionKey = await newCredential.getStorageEncryptionKey();
        await this.backendApi.account.changeCredentials(oldPrivateKey, newPrivateKey);
        this.#state.credential = newCredential;
        this.#state.encryptedStorage = new EncryptedStorage(newStorageEncryptionKey);
        console.info(`Changed passphrase for ${uuid}.`);
    }

    public async deleteAccountAndSignOut(authToken: symbol, passphrase: string): Promise<void> {
        if (authToken !== this.#state.authToken) {
            throw new Error('Invalid auth token.');
        }

        const uuid = this.accountUuid;
        if (!uuid || !this.#state.credential) {
            throw new Error('Not signed in.');
        }
        const savedKeyId = await this.#state.credential.getKeyId();
        const credential = this.createPassphraseCredential(uuid, passphrase);
        const keyId = await credential.getKeyId();
        if (savedKeyId !== keyId) {
            throw new Error('Incorrect passphrase.');
        }

        const privateKey = await credential.getBackendAuthPrivateKey();
        await this.backendApi.account.delete(privateKey);
        console.info(`Deleted account ${uuid}.`);
        this.signOut();
    }

    public get encryptedStorage(): EncryptedStorage | undefined {
        return this.#state.encryptedStorage;
    }
}

declare global {
    var alarkhabil: Alarkhabil;
}

Object.defineProperty(globalThis, 'alarkhabil', {
    value: new Alarkhabil(),
    writable: false,
    enumerable: true,
    configurable: false,
});
