
import { BackendApi } from "../backend-api";
import { InviteToken } from "../invite-token";

import * as ed25519 from '../crypto/ed25519';
import * as base64 from '../base64';


interface MsgAccountNew {
    readonly command: 'account_new';
    readonly name: string; // displayed name
    readonly invite: string; // invite token
}

interface MsgAccountCheckCredentials {
    readonly command: 'account_check_credentials';
}

interface MsgAccountChangeCredentials {
    readonly command: 'account_change_credentials';
    readonly new_algo: 'ed25519';
    readonly new_public_key: string; // base64
    readonly signature: string; // base64, signature of old public key by new private key
}

interface MsgAccountDelete {
    readonly command: 'account_delete';
}

interface ResponseAccountNew {
    readonly uuid: string; // user UUID
}

export class BackendApiAccount {
    readonly #backendApi: BackendApi;

    public constructor(backendApi: BackendApi) {
        this.#backendApi = backendApi;
    }

    public async createNew(privateKey: ed25519.PrivateKey, inviteToken: InviteToken, name: string): Promise<void> {
        const token = inviteToken.token;
        const msg: MsgAccountNew = {
            command: 'account_new',
            name: name,
            invite: token,
        };
        const signedMessage = await privateKey.sign(msg);
        const result = await this.#backendApi.v1.postSigned<ResponseAccountNew>('account/new', signedMessage);
        if (!result.ok) {
            throw new Error(`Failed to create an account: ${result.status}`);
        }
        const uuid = result.data.uuid;
        console.assert(uuid === inviteToken.uuid);
    }

    public async checkCredentials(privateKey: ed25519.PrivateKey): Promise<void> {
        const msg: MsgAccountCheckCredentials = {
            command: 'account_check_credentials',
        };
        const signedMessage = await privateKey.sign(msg);
        const result = await this.#backendApi.v1.postSigned<unknown>('account/check_credentials', signedMessage);
        if (!result.ok) {
            throw new Error(`Failed to authenticate as an account: ${result.status}`);
        }
    }

    public async changeCredentials(oldPrivateKey: ed25519.PrivateKey, newPrivateKey: ed25519.PrivateKey): Promise<void> {
        const oldPublicKey = await oldPrivateKey.getPublicKey();
        const newPublicKey = await newPrivateKey.getPublicKey();
        const msg: MsgAccountChangeCredentials = {
            command: 'account_change_credentials',
            new_algo: 'ed25519',
            new_public_key: newPublicKey.toBase64(),
            signature: base64.encode(await newPrivateKey.getSignatureForBytes(oldPublicKey.getBytes())),
        };
        const signedMessage = await oldPrivateKey.sign(msg);
        const result = await this.#backendApi.v1.postSigned<unknown>('account/change_credentials', signedMessage);
        if (!result.ok) {
            throw new Error(`Failed to change credentials: ${result.status}`);
        }
    }

    public async delete(privateKey: ed25519.PrivateKey): Promise<void> {
        const msg: MsgAccountDelete = {
            command: 'account_delete',
        };
        const signedMessage = await privateKey.sign(msg);
        const result = await this.#backendApi.v1.postSigned<unknown>('account/delete', signedMessage);
        if (!result.ok) {
            throw new Error(`Failed to delete account: ${result.status}`);
        }
    }
}
