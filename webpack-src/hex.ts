
export const encode = (bytes: Uint8Array): string => {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const decode = (hex: string): Uint8Array => {
    hex = String(hex).trim().toLowerCase();
    if (!/(^[0-9a-f]{2})*$/.test(hex)) {
        throw new Error('Invalid hex string.');
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
};
