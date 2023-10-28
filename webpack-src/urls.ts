
export const resolve = (url: string, base = document.location.href): string => {
    try {
        new URL(base);
    } catch (e) {
        base = new URL(base, document.location.href).href;
    }
    return (new URL(url, base)).href;
};
