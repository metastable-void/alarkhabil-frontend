
import { BackendApi } from "../backend-api";
import { Uuid } from "../uuid";


// API response types

export interface ResponseAuthorInfo {
    readonly uuid: string;
    readonly name: string;
    readonly created_date: number; // unix timestamp in seconds
    readonly description_text: string; // Markdown text
}

export interface ResponseAuthorSummary {
    readonly uuid: string;
    readonly name: string;
}


// Types for frontend use

export interface AuthorDetails {
    readonly uuid: Uuid;
    readonly name: string;
    readonly createdDate: number; // unix timestamp in seconds
    readonly descriptionText: string; // Markdown text
}

export interface AuthorSummary {
    readonly uuid: Uuid;
    readonly name: string;
}

export class BackendApiAuthor {
    readonly #backendApi: BackendApi;

    public constructor(backendApi: BackendApi) {
        this.#backendApi = backendApi;
    }

    public async get(uuid: Uuid): Promise<AuthorDetails> {
        const params = new URLSearchParams();
        params.set('uuid', uuid);
        const result = await this.#backendApi.v1.get<ResponseAuthorInfo>('author/info', params);
        if (!result.ok) {
            throw new Error(`Failed to get author: ${result.status}`);
        }
        return {
            uuid: Uuid(result.data.uuid),
            name: result.data.name,
            createdDate: result.data.created_date,
            descriptionText: result.data.description_text,
        };
    }

    public async list(): Promise<AuthorSummary[]> {
        const result = await this.#backendApi.v1.get<ResponseAuthorSummary[]>('author/list');
        if (!result.ok) {
            throw new Error(`Failed to list authors: ${result.status}`);
        }
        return result.data.map((author) => {
            return {
                uuid: Uuid(author.uuid),
                name: author.name,
            };
        });
    }

    public async listByChannel(channelUuid: Uuid): Promise<AuthorSummary[]> {
        const params = new URLSearchParams();
        params.set('uuid', channelUuid);
        const result = await this.#backendApi.v1.get<ResponseAuthorSummary[]>('channel/authors', params);
        if (!result.ok) {
            throw new Error(`Failed to list authors: ${result.status}`);
        }
        return result.data.map((author) => {
            return {
                uuid: Uuid(author.uuid),
                name: author.name,
            };
        });
    }
}
