
declare const UUID: unique symbol;

const UUID_PATTERN = /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/;

export type Uuid = string & { [UUID]: never };

export function Uuid(value: unknown): Uuid {
    if (new.target != null) {
        throw new Error('Uuid is not a constructor.');
    }
    const strValue = String(value).trim().toLowerCase();
    if (!UUID_PATTERN.test(strValue)) {
        throw new Error('Invalid UUID.');
    }
    return strValue as Uuid;
}

export namespace Uuid {
    export const UUID_NIL = '00000000-0000-0000-0000-000000000000' as Uuid;

    export const isUuid = (value: unknown): value is Uuid => {
        return typeof value === 'string' && UUID_PATTERN.test(value);
    };

    export const toBytes = (uuid: Uuid): Uint8Array => {
        const hex = uuid.replace(/-/g, '');
        const bytes = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
            bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    };
}
