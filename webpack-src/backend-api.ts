
import { Api } from "./api";
import * as urls from "./urls";
import { BackendApiInvite } from "./backend/invite";


interface BackendApiState {
    backendUrl: string;
}

export class BackendApi {
    #state: BackendApiState;
    readonly #urlUpdateToken: symbol;

    public readonly invite: BackendApiInvite;

    /**
     * Create an instance of BackendApi.
     * @param backendUrl 
     * @param urlUpdateToken You cannot change backend URL later without providing this token.
     */
    public constructor(backendUrl: string, urlUpdateToken?: symbol) {
        this.#state = {
            backendUrl: urls.resolve(backendUrl, '/'),
        };
        this.#urlUpdateToken = urlUpdateToken ?? Symbol('TOKEN_NONE');
        this.invite = new BackendApiInvite(this);
        Object.freeze(this);
    }

    public get backendUrl(): string {
        return this.#state.backendUrl;
    }

    /**
     * Version 1 of the API.
     */
    public get v1(): Api {
        return new Api(urls.resolve('/api/v1/', this.backendUrl));
    }

    /**
     * Update backend URL by a token used to initialize this instance.
     * @param backendUrl 
     * @param urlUpdateToken URL update token used to prevent URL update from other sources.
     */
    public updateUrl(backendUrl: string, urlUpdateToken: symbol): void {
        if (this.#urlUpdateToken !== urlUpdateToken) {
            throw new Error('Invalid token.');
        }
        this.#state.backendUrl = urls.resolve(backendUrl, '/');
    }
}

Object.freeze(BackendApi);
Object.freeze(BackendApi.prototype);