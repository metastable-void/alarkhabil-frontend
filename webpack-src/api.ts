
import * as urls from './urls';
import { Ed25519SignedMessage } from './crypto/ed25519';


export class ApiResult<T> {
    public readonly status: number;
    public readonly ok: boolean;
    public readonly data: T;
    public readonly error: any;

    public constructor(status: number, data: T) {
        this.status = status;
        this.ok = status >= 200 && status < 300;
        this.data = data;
        if (!this.ok) {
            this.error = data;
        }
    }
}

export class Api {
    public readonly baseUrl: string;

    public constructor(baseUrl: string) {
        this.baseUrl = urls.resolve(baseUrl, '/');
    }

    public async get<Res>(endpointUrl: string, queries?: URLSearchParams | null): Promise<ApiResult<Res>> {
        const url = new URL(endpointUrl, this.baseUrl);
        if (queries) {
            url.search = queries.toString();
        }
        const response = await fetch(url.href);
        const status = response.status;
        const data = await response.json();
        return new ApiResult<Res>(status, data);
    }

    public async post<Req, Res>(endpointUrl: string, body: Req, queries?: URLSearchParams | null): Promise<ApiResult<Res>> {
        const url = new URL(endpointUrl, this.baseUrl);
        if (queries) {
            url.search = queries.toString();
        }
        const response = await fetch(url.href, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const status = response.status;
        const data = await response.json();
        return new ApiResult<Res>(status, data);
    }

    public async postSigned<Res>(endpointUrl: string, signedMessage: Ed25519SignedMessage, queries?: URLSearchParams | null): Promise<ApiResult<Res>> {
        Ed25519SignedMessage.verify(signedMessage); // validate
        return await this.post<Ed25519SignedMessage, Res>(endpointUrl, signedMessage, queries);
    }

    public async postEmpty<Res>(endpointUrl: string, queries?: URLSearchParams | null): Promise<ApiResult<Res>> {
        const url = new URL(endpointUrl, this.baseUrl);
        if (queries) {
            url.search = queries.toString();
        }
        const response = await fetch(url.href, {
            method: 'POST',
        });
        const status = response.status;
        const data = await response.json();
        return new ApiResult<Res>(status, data);
    }
}
