
import { Uuid } from "../uuid";
import { DnsToken } from "../dns-token";
import { BackendApi } from "../backend-api";
import * as ed25519 from '../crypto/ed25519';
import { ResponseAuthorSummary, AuthorSummary } from "./author";
import { ResponseChannelSummary, ChannelSummary } from "./channel";


// API request types

interface MsgPostNew {
    readonly command: 'post_new';
    readonly channel_uuid: string;
    readonly tags: string[];
    readonly title: string;
    readonly text: string; // Markdown text
}

interface MsgPostUpdate {
    readonly command: 'post_update';
    readonly uuid: string;
    readonly tags: string[];
    readonly title: string;
    readonly text: string; // Markdown text
}

interface MsgPostDelete {
    readonly command: 'post_delete';
    readonly uuid: string;
}


// API response types

export interface ResponsePageInfo {
    readonly post_uuid: string;
    readonly channel: ResponseChannelSummary;
    readonly tags: string[];
    readonly revision_uuid: string;
    readonly revision_date: number; // unix timestamp in seconds
    readonly title: string;
    readonly revision_text: string; // Markdown text
    readonly author: ResponseAuthorSummary;
}

export interface ResponsePageSummaryWithAuthor {
    readonly post_uuid: string;
    readonly revision_uuid: string;
    readonly revision_date: number; // unix timestamp in seconds
    readonly title: string;
    readonly author: ResponseAuthorSummary;
}

export interface ResponsePageSummaryWithChannel {
    readonly post_uuid: string;
    readonly revision_uuid: string;
    readonly revision_date: number; // unix timestamp in seconds
    readonly title: string;
    readonly channel: ResponseChannelSummary;
}

export interface ResponsePageSummary {
    readonly post_uuid: string;
    readonly revision_uuid: string;
    readonly revision_date: number; // unix timestamp in seconds
    readonly title: string;
    readonly author: ResponseAuthorSummary;
    readonly channel: ResponseChannelSummary;
}


// Types for frontend use

export interface PageDetails {
    readonly postUuid: Uuid;
    readonly channel: ChannelSummary;
    readonly tags: string[];
    readonly revisionUuid: string;
    readonly revisionDate: number; // unix timestamp in seconds
    readonly title: string;
    readonly revisionText: string; // Markdown text
    readonly author: AuthorSummary;
}

namespace PageDetails {
    export const fromResponse = (response: ResponsePageInfo): PageDetails => ({
        postUuid: Uuid(response.post_uuid),
        channel: {
            uuid: Uuid(response.channel.uuid),
            handle: DnsToken(response.channel.handle),
            name: response.channel.name,
            lang: response.channel.lang,
        },
        tags: response.tags,
        revisionUuid: response.revision_uuid,
        revisionDate: response.revision_date,
        title: response.title,
        revisionText: response.revision_text,
        author: {
            uuid: Uuid(response.author.uuid),
            name: response.author.name,
        },
    });
}

export interface PageSummary {
    readonly postUuid: Uuid;
    readonly revisionUuid: string;
    readonly revisionDate: number; // unix timestamp in seconds
    readonly title: string;
    readonly author?: AuthorSummary;
    readonly channel?: ChannelSummary;
}

namespace PageSummary {
    export const fromResponseWithAuthor = (response: ResponsePageSummaryWithAuthor): PageSummary => ({
        postUuid: Uuid(response.post_uuid),
        revisionUuid: response.revision_uuid,
        revisionDate: response.revision_date,
        title: response.title,
        author: {
            uuid: Uuid(response.author.uuid),
            name: response.author.name,
        },
    });

    export const fromResponseWithChannel = (response: ResponsePageSummaryWithChannel): PageSummary => ({
        postUuid: Uuid(response.post_uuid),
        revisionUuid: response.revision_uuid,
        revisionDate: response.revision_date,
        title: response.title,
        channel: {
            uuid: Uuid(response.channel.uuid),
            handle: DnsToken(response.channel.handle),
            name: response.channel.name,
            lang: response.channel.lang,
        },
    });

    export const fromResponse = (response: ResponsePageSummary): PageSummary => ({
        postUuid: Uuid(response.post_uuid),
        revisionUuid: response.revision_uuid,
        revisionDate: response.revision_date,
        title: response.title,
        channel: {
            uuid: Uuid(response.channel.uuid),
            handle: DnsToken(response.channel.handle),
            name: response.channel.name,
            lang: response.channel.lang,
        },
        author: {
            uuid: Uuid(response.author.uuid),
            name: response.author.name,
        },
    });
}


export class BackendApiPost {
    readonly #backendApi: BackendApi;

    public constructor(backendApi: BackendApi) {
        this.#backendApi = backendApi;
    }

    public async get(uuid: Uuid): Promise<PageDetails> {
        const params = new URLSearchParams();
        params.set('uuid', uuid.toString());
        const result = await this.#backendApi.v1.get<ResponsePageInfo>('post/info', params);
        if (!result.ok) {
            throw new Error(`Failed to get post: ${result.status}`);
        }
        return PageDetails.fromResponse(result.data);
    }

    public async list(): Promise<PageSummary[]> {
        const result = await this.#backendApi.v1.get<ResponsePageSummary[]>('post/list');
        if (!result.ok) {
            throw new Error(`Failed to list posts: ${result.status}`);
        }
        return result.data.map(PageSummary.fromResponse);
    }

    public async createNew(
        privateKey: ed25519.PrivateKey,
        channelUuid: Uuid,
        title: string,
        text: string,
        tags: string[] = [],
    ): Promise<PageDetails> {
        const msg: MsgPostNew = {
            command: 'post_new',
            channel_uuid: channelUuid.toString(),
            tags: tags,
            title: title,
            text: text,
        };
        const signedMessage = await privateKey.sign(msg);
        const result = await this.#backendApi.v1.postSigned<ResponsePageInfo>('post/new', signedMessage);
        if (!result.ok) {
            throw new Error(`Failed to create new post: ${result.status}`);
        }
        return PageDetails.fromResponse(result.data);
    }

    public async update(
        privateKey: ed25519.PrivateKey,
        uuid: Uuid,
        title: string,
        text: string,
        tags: string[] = [],
    ): Promise<PageDetails> {
        const msg: MsgPostUpdate = {
            command: 'post_update',
            uuid: uuid.toString(),
            tags: tags,
            title: title,
            text: text,
        };
        const signedMessage = await privateKey.sign(msg);
        const result = await this.#backendApi.v1.postSigned<ResponsePageInfo>('post/update', signedMessage);
        if (!result.ok) {
            throw new Error(`Failed to update post: ${result.status}`);
        }
        return PageDetails.fromResponse(result.data);
    }

    public async delete(
        privateKey: ed25519.PrivateKey,
        uuid: Uuid,
    ): Promise<void> {
        const msg: MsgPostDelete = {
            command: 'post_delete',
            uuid: uuid.toString(),
        };
        const signedMessage = await privateKey.sign(msg);
        const result = await this.#backendApi.v1.postSigned('post/delete', signedMessage);
        if (!result.ok) {
            throw new Error(`Failed to delete post: ${result.status}`);
        }
    }

    public async listByTag(tagName: string): Promise<PageSummary[]> {
        const params = new URLSearchParams();
        params.set('tag_name', tagName);
        const result = await this.#backendApi.v1.get<ResponsePageSummary[]>('tag/posts', params);
        if (!result.ok) {
            throw new Error(`Failed to list posts by tag: ${result.status}`);
        }
        return result.data.map(PageSummary.fromResponse);
    }

    public async listByAuthor(authorUuid: Uuid): Promise<PageSummary[]> {
        const params = new URLSearchParams();
        params.set('uuid', authorUuid.toString());
        const result = await this.#backendApi.v1.get<ResponsePageSummaryWithChannel[]>('author/posts', params);
        if (!result.ok) {
            throw new Error(`Failed to list posts by author: ${result.status}`);
        }
        return result.data.map(PageSummary.fromResponseWithChannel);
    }

    public async listByChannel(channelUuid: Uuid): Promise<PageSummary[]> {
        const params = new URLSearchParams();
        params.set('uuid', channelUuid.toString());
        const result = await this.#backendApi.v1.get<ResponsePageSummaryWithAuthor[]>('channel/posts', params);
        if (!result.ok) {
            throw new Error(`Failed to list posts by channel: ${result.status}`);
        }
        return result.data.map(PageSummary.fromResponseWithAuthor);
    }
}
