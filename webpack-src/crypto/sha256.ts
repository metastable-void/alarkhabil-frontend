
export class Sha256 {
    public static async digest(message: Uint8Array): Promise<Uint8Array> {
        const hash = await crypto.subtle.digest('SHA-256', message);
        return new Uint8Array(hash);
    }

    public static async digestHex(message: Uint8Array): Promise<string> {
        const hash = await this.digest(message);
        return this.toHex(hash);
    }

    private static toHex(bytes: Uint8Array): string {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

Object.freeze(Sha256);
