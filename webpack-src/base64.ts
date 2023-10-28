
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

export const encode = (bytes: Uint8Array) => {
    let result = '';
    let i = 0;
    const paddingLength = bytes.length % 3;
    while (i < bytes.length) {
        const a = bytes[i++];
        const b = 0 | bytes[i++];
        const c = 0 | bytes[i++];
        const bits = (a << 16) | (b << 8) | c;
        result += BASE64_CHARS.charAt(bits >> 18 & 0b111111)
            + BASE64_CHARS.charAt(bits >> 12 & 0b111111)
            + BASE64_CHARS.charAt(bits >> 6 & 0b111111)
            + BASE64_CHARS.charAt(bits & 0b111111);
    }
    return paddingLength ? result.slice(0, paddingLength - 3) + '==='.slice(paddingLength) : result;
};

export const decode = (str: string) => new Uint8Array(function* () {
    let string = String(str).replace(/[\t\n\f\r ]+/g, '');
    string += '=='.slice(2 - (string.length & 3));
    let i = 0;
    while (i < string.length) {
        const a = BASE64_CHARS.indexOf(string.charAt(i++));
        const b = BASE64_CHARS.indexOf(string.charAt(i++));
        const c = BASE64_CHARS.indexOf(string.charAt(i++));
        const d = BASE64_CHARS.indexOf(string.charAt(i++));
        if (a < 0 || b < 0 || c < 0 || d < 0 || a == 64 || b == 64) {
            throw new TypeError('Invalid base-64 string');
        }
        const bits = a << 18 | b << 12 | c << 6 | d;
        if (c == 64) {
            yield bits >> 16 & 0xff;
        } else if (d == 64) {
            yield bits >> 16 & 0xff;
            yield bits >> 8 & 0xff;
        } else {
            yield bits >> 16 & 0xff;
            yield bits >> 8 & 0xff;
            yield bits & 0xff;
        }
    }
}());
