
import { BackendApi } from "../backend-api";
import { Uuid } from "../uuid";
import { DnsToken } from "../dns-token";
import * as ed25519 from '../crypto/ed25519';


// API request types

interface MsgChannelNew {
    readonly command: 'channel_new';
    readonly handle: string;
    readonly name: string;
    readonly lang: string; // language code
}

interface MsgChannelUpdate {
    readonly command: 'channel_update';
    readonly uuid: string;
    readonly handle: string;
    readonly name: string;
    readonly lang: string; // language code
    readonly description_text: string; // Markdown text
}

interface MsgChannelDelete {
    readonly command: 'channel_delete';
    readonly uuid: string;
}


// API response types

export interface ResponseChannelInfo {
    readonly uuid: string;
    readonly handle: string;
    readonly name: string;
    readonly created_date: number; // unix timestamp in seconds
    readonly lang: string; // language code
    readonly description_text: string; // Markdown text
}

export interface ResponseChannelSummary {
    readonly uuid: string;
    readonly handle: string;
    readonly name: string;
    readonly lang: string; // language code
}


// Types for frontend use

export interface ChannelDetails {
    readonly uuid: Uuid;
    readonly handle: DnsToken;
    readonly name: string;
    readonly createdDate: number; // unix timestamp in seconds
    readonly lang: string; // language code
    readonly descriptionText: string; // Markdown text
}

export interface ChannelSummary {
    readonly uuid: Uuid;
    readonly handle: DnsToken;
    readonly name: string;
    readonly lang: string; // language code
}

export class BackendApiChannel {
    readonly #backendApi: BackendApi;

    public constructor(backendApi: BackendApi) {
        this.#backendApi = backendApi;
    }

    public async get(uuid: Uuid): Promise<ChannelDetails> {
        const params = new URLSearchParams();
        params.set('uuid', uuid);
        const result = await this.#backendApi.v1.get<ResponseChannelInfo>('channel/info', params);
        if (!result.ok) {
            throw new Error(`Failed to get channel: ${result.status}`);
        }
        return {
            uuid: Uuid(result.data.uuid),
            handle: DnsToken(result.data.handle),
            name: result.data.name,
            createdDate: result.data.created_date,
            lang: result.data.lang,
            descriptionText: result.data.description_text,
        };
    }

    public async getByHandle(handle: DnsToken): Promise<ChannelDetails> {
        const params = new URLSearchParams();
        params.set('handle', handle);
        const result = await this.#backendApi.v1.get<ResponseChannelInfo>('channel/info', params);
        if (!result.ok) {
            throw new Error(`Failed to get channel: ${result.status}`);
        }
        return {
            uuid: Uuid(result.data.uuid),
            handle: DnsToken(result.data.handle),
            name: result.data.name,
            createdDate: result.data.created_date,
            lang: result.data.lang,
            descriptionText: result.data.description_text,
        };
    }

    public async list(): Promise<ChannelSummary[]> {
        const result = await this.#backendApi.v1.get<ResponseChannelSummary[]>('channel/list');
        if (!result.ok) {
            throw new Error(`Failed to list channels: ${result.status}`);
        }
        return result.data.map((channel) => {
            return {
                uuid: Uuid(channel.uuid),
                handle: DnsToken(channel.handle),
                name: channel.name,
                lang: channel.lang,
            };
        });
    }

    public async createNew(privateKey: ed25519.PrivateKey, handle: DnsToken, name: string, lang: string): Promise<ChannelDetails> {
        const msg: MsgChannelNew = {
            command: 'channel_new',
            handle: handle,
            name: name,
            lang: lang,
        };
        const signedMessage = await privateKey.sign(msg);
        const result = await this.#backendApi.v1.postSigned<ResponseChannelInfo>('channel/new', signedMessage);
        if (!result.ok) {
            throw new Error(`Failed to create a channel: ${result.status}`);
        }
        return {
            uuid: Uuid(result.data.uuid),
            handle: DnsToken(result.data.handle),
            name: result.data.name,
            createdDate: result.data.created_date,
            lang: result.data.lang,
            descriptionText: result.data.description_text,
        };
    }

    public async update(privateKey: ed25519.PrivateKey, uuid: Uuid, handle: DnsToken, name: string, lang: string, descriptionText: string): Promise<ChannelDetails> {
        const msg: MsgChannelUpdate = {
            command: 'channel_update',
            uuid: uuid,
            handle: handle,
            name: name,
            lang: lang,
            description_text: descriptionText,
        };
        const signedMessage = await privateKey.sign(msg);
        const result = await this.#backendApi.v1.postSigned<ResponseChannelInfo>('channel/update', signedMessage);
        if (!result.ok) {
            throw new Error(`Failed to update a channel: ${result.status}`);
        }
        return {
            uuid: Uuid(result.data.uuid),
            handle: DnsToken(result.data.handle),
            name: result.data.name,
            createdDate: result.data.created_date,
            lang: result.data.lang,
            descriptionText: result.data.description_text,
        };
    }

    public async delete(privateKey: ed25519.PrivateKey, uuid: Uuid): Promise<void> {
        const msg: MsgChannelDelete = {
            command: 'channel_delete',
            uuid: uuid,
        };
        const signedMessage = await privateKey.sign(msg);
        const result = await this.#backendApi.v1.postSigned<unknown>('channel/delete', signedMessage);
        if (!result.ok) {
            throw new Error(`Failed to delete a channel: ${result.status}`);
        }
    }
}
