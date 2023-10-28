
export const encode = (str: string) => (new TextEncoder()).encode(str);
export const decode = (bytes: Uint8Array) => (new TextDecoder()).decode(bytes);
