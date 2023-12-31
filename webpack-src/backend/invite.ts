
import { BackendApi } from "../backend-api";
import { InviteToken } from "../invite-token";


interface ResponseInviteNew {
    readonly invite: string; // invite token
}

export class BackendApiInvite {
    readonly #backendApi: BackendApi;

    public constructor(backendApi: BackendApi) {
        this.#backendApi = backendApi;
    }

    public async createNew(inviteMakingToken: string): Promise<InviteToken> {
        const params = new URLSearchParams();
        params.set('token', inviteMakingToken);
        const result = await this.#backendApi.v1.get<ResponseInviteNew>('invite/new', params);
        if (!result.ok) {
            throw new Error(`Failed to create new invite: ${result.status}`);
        }
        return new InviteToken(result.data.invite);
    }
}
