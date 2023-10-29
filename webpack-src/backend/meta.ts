
import { BackendApi } from "../backend-api";
import { DnsToken } from "../dns-token";


interface MsgMetaUpdate {
    readonly page_name: string;
    readonly title: string;
    readonly text: string;
}

interface ResponseMetaInfo {
    readonly page_name: string;
    readonly updated_date: number;
    readonly title: string;
    readonly text: string;
}

interface ResponseMetaSummary {
    readonly page_name: string;
    readonly updated_date: number;
    readonly title: string;
}


// frontend types

export interface MetaPageDetails {
    readonly pageName: DnsToken;
    readonly updatedDate: number;
    readonly title: string;
    readonly text: string;
}

export interface MetaPageSummary {
    readonly pageName: DnsToken;
    readonly updatedDate: number;
    readonly title: string;
}

/**
 * API about meta pages.
 */
export class BackendApiMeta {
    readonly #backendApi: BackendApi;

    public constructor(backendApi: BackendApi) {
        this.#backendApi = backendApi;
    }

    public async adminUpdate(adminToken: string, pageName: DnsToken, title: string, markdownText: string): Promise<void> {
        const params = new URLSearchParams();
        params.set('token', adminToken);
        const result = await this.#backendApi.v1.post<MsgMetaUpdate, unknown>('admin/meta/update', {
            page_name: pageName,
            title: title,
            text: markdownText,
        }, params);
        if (!result.ok) {
            throw new Error(`Failed to update meta: ${result.status}`);
        }
    }

    public async adminDelete(adminToken: string, pageName: DnsToken): Promise<void> {
        const params = new URLSearchParams();
        params.set('token', adminToken);
        params.set('page_name', pageName);
        const result = await this.#backendApi.v1.postEmpty<unknown>('admin/meta/delete', params);
        if (!result.ok) {
            throw new Error(`Failed to delete meta: ${result.status}`);
        }
    }

    public async get(pageName: DnsToken): Promise<MetaPageDetails> {
        const params = new URLSearchParams();
        params.set('page_name', pageName);
        const result = await this.#backendApi.v1.get<ResponseMetaInfo>('meta/info', params);
        if (!result.ok) {
            throw new Error(`Failed to get meta: ${result.status}`);
        }
        const info = result.data;
        return {
            pageName: DnsToken(info.page_name),
            updatedDate: info.updated_date,
            title: info.title,
            text: info.text,
        };
    }

    public async list(): Promise<MetaPageSummary[]> {
        const result = await this.#backendApi.v1.get<ResponseMetaSummary[]>('meta/list');
        if (!result.ok) {
            throw new Error(`Failed to list meta: ${result.status}`);
        }
        return result.data.map((info) => {
            return {
                pageName: DnsToken(info.page_name),
                updatedDate: info.updated_date,
                title: info.title,
            };
        });
    }
}
