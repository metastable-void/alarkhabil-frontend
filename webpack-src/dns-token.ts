
declare const DNS_TOKEN: unique symbol;

export type DnsToken = string & { [DNS_TOKEN]: never };

const pattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function DnsToken(value: unknown): DnsToken {
    if (new.target != null) {
        throw new Error('DnsToken is not a constructor.');
    }
    const strValue = String(value).trim().toLowerCase();
    if (!pattern.test(strValue)) {
        throw new Error('Invalid DNS token.');
    }
    return strValue as DnsToken;
}

export namespace DnsToken {
    export const isDnsToken = (value: unknown): value is DnsToken => {
        return typeof value === 'string' && pattern.test(value);
    };
}
