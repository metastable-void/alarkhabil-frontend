
import * as base64 from './base64';
import * as utf8 from './utf8';
import { SignedMessage } from './crypto/crypto';


interface InnerInviteMessage {
    readonly command: 'registration_invite';
    readonly uuid: string;
}

/**
 * Parse an invite token without verifying its signature (done by the backend).
 */
export class InviteToken {
    public readonly token: string;
    public readonly uuid: string;

    public constructor(token: string) {
        this.token = token;
        const serverSignedMessage: SignedMessage = JSON.parse(utf8.decode(base64.decode(token)));
        const innerMessage: InnerInviteMessage = JSON.parse(utf8.decode(base64.decode(serverSignedMessage.msg)));
        console.assert(innerMessage.command === 'registration_invite');
        this.uuid = innerMessage.uuid;
        Object.freeze(this);
    }

    public toString(): string {
        return this.token;
    }
}

Object.freeze(InviteToken);
Object.freeze(InviteToken.prototype);
