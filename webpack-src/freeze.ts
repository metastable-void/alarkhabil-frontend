
const deepFreezeInner = <T extends object>(obj: T, visited = new WeakSet<object>()): Readonly<T> => {
    if (visited.has(obj)) {
        return obj;
    }
    visited.add(obj);
    const keys = Reflect.ownKeys(obj);
    const records = obj as Record<string | symbol, unknown>;
    for (const key of keys) {
        const value = records[key];
        if (typeof value === 'object' && value !== null) {
            deepFreezeInner(value, visited);
        }
    }
    return Object.freeze(obj);
};

/**
 * Recursively freezes a JSON-like object.
 * @param obj object to freeze
 */
export const deepFreeze = <T extends object>(obj: T): Readonly<T> => deepFreezeInner(obj);
