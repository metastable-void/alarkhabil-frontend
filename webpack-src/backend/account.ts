
import { BackendApi } from "../backend-api";
import { InviteToken } from "../invite-token";

import * as ed25519 from '../crypto/ed25519';


interface MsgAccountNew {
    readonly command: 'account_new';
    readonly name: string; // displayed name
    readonly invite: string; // invite token
}

interface MsgAccountCheckCredentials {
    readonly command: 'account_check_credentials';
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
}
