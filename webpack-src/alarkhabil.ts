
import { SiteConfig } from "./site-config";
import { FrontendApi } from "./frontend-api";
import { BackendApi } from "./backend-api";
import { deepFreeze } from "./freeze";
import { PassphraseCredential } from "./passphrase";
import { Uuid } from "./uuid";
import { EncryptedStorage } from "./storage/storage";


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
    static readonly #BACKEND_API_UPDATE_TOKEN: unique symbol = Symbol('BACKEND_API_UPDATE_TOKEN');

    static #instance: Alarkhabil | undefined;

    readonly #state: SingletonState;

    public readonly frontendApi: FrontendApi;
    public readonly backendApi: BackendApi;

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

    #generateAuthToken(): symbol {
        const now = Date.now();
        return Symbol(`AUTH_TOKEN_${now}`);
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
        return this.#state.authToken;
    }

    /**
     * Sign out and clear the credential.
     */
    public signOut(): void {
        this.#state.credential = undefined;
        this.#state.authToken = this.#generateAuthToken();
        this.#state.encryptedStorage = undefined;
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

    public async changePassphrase(oldPassphrase: string, newPassphrase: string): Promise<void> {
        const uuid = this.accountUuid;
        if (!uuid) {
            throw new Error('Not signed in.');
        }
        const oldCredential = this.createPassphraseCredential(uuid, oldPassphrase);
        const oldPrivateKey = await oldCredential.getBackendAuthPrivateKey();
        const newCredential = this.createPassphraseCredential(uuid, newPassphrase);
        const newPrivateKey = await newCredential.getBackendAuthPrivateKey();
        const newStorageEncryptionKey = await newCredential.getStorageEncryptionKey();
        await this.backendApi.account.changeCredentials(oldPrivateKey, newPrivateKey);
        this.#state.credential = newCredential;
        this.#state.encryptedStorage = new EncryptedStorage(newStorageEncryptionKey);
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
