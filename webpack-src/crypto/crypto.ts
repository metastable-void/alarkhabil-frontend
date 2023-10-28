
export interface SignedMessage {
    readonly algo: string;
    readonly msg: string; // base64 encoded
}
