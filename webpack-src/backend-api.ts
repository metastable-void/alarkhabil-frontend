
import { Api, ApiResult } from "./api";
import * as urls from "./urls";
import { BackendApiInvite } from "./backend/invite";
import { BackendApiAccount } from "./backend/account";
import { BackendApiMeta } from "./backend/meta";
import { BackendApiAuthor } from "./backend/author";
import { BackendApiChannel } from "./backend/channel";
import { BackendApiTag } from "./backend/tag";
import { BackendApiPost } from "./backend/post";


interface BackendApiState {
    backendUrl: string;
}

export class BackendApi {
    #state: BackendApiState;
    readonly #urlUpdateToken: symbol;

    public readonly invite: BackendApiInvite;
    public readonly account: BackendApiAccount;
    public readonly meta: BackendApiMeta;
    public readonly author: BackendApiAuthor;
    public readonly channel: BackendApiChannel;
    public readonly tag: BackendApiTag;
    public readonly post: BackendApiPost;

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
        this.account = new BackendApiAccount(this);
        this.meta = new BackendApiMeta(this);
        this.author = new BackendApiAuthor(this);
        this.channel = new BackendApiChannel(this);
        this.tag = new BackendApiTag(this);
        this.post = new BackendApiPost(this);
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

    public async v1PostSigned<TRequest, TResponse>(authToken: symbol, endpointUrl: string, message: TRequest): Promise<ApiResult<TResponse>> {
        const authorKey = await alarkhabil.getAuthorKey(this.#urlUpdateToken, authToken);
        const signedMessage = await authorKey.sign(message);
        return this.v1.postSigned<TResponse>(endpointUrl, signedMessage);
    }
}

Object.freeze(BackendApi);
Object.freeze(BackendApi.prototype);
