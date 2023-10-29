
import { BackendApi } from "../backend-api";


// API response types

export interface ResponseTagSummary {
    readonly tag_name: string;
    readonly page_count: number;
}


// Types for frontend use

export interface TagSummary {
    readonly tagName: string;
    readonly pageCount: number;
}


export class BackendApiTag {
    readonly #backendApi: BackendApi;

    public constructor(backendApi: BackendApi) {
        this.#backendApi = backendApi;
    }

    public async list(): Promise<TagSummary[]> {
        const result = await this.#backendApi.v1.get<ResponseTagSummary[]>('tag/list');
        if (!result.ok) {
            throw new Error(`Failed to list tags: ${result.status}`);
        }
        return result.data.map((tag) => ({
            tagName: tag.tag_name,
            pageCount: tag.page_count,
        }));
    }
}
