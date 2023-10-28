
import { SiteConfig } from "./site-config";
import { FrontendApi } from "./frontend-api";
import { BackendApi } from "./backend-api";
import { deepFreeze } from "./freeze";


interface SingletonState {
    siteConfig: SiteConfig;
}

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
        if (Alarkhabil.#instance) {
            return Alarkhabil.#instance;
        }

        // BEGIN Singleton initialization
        this.#state = {
            siteConfig: SiteConfig.INITIAL,
        };
        this.frontendApi = new FrontendApi();
        this.backendApi = new BackendApi(this.#state.siteConfig.api_url, Alarkhabil.#BACKEND_API_UPDATE_TOKEN);
        // END Singleton initialization

        Alarkhabil.#instance = this;
        Object.freeze(Alarkhabil);
        Object.freeze(Alarkhabil.prototype);
        Object.freeze(this);
    }

    public get siteConfig(): SiteConfig {
        return this.#state.siteConfig;
    }

    #handleSiteConfigChange = (newConfig: SiteConfig) => {
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
