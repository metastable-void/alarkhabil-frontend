
import * as base64 from './base64';


/**
 * Workaround for TypedArray which does not allow freezing.
 */
export class ImmutableBytes {
    readonly #bytes: Uint8Array;

    public static fromBase64(encoded: string): ImmutableBytes {
        return new ImmutableBytes(base64.decode(encoded));
    }

    public constructor(bytes: Uint8Array) {
        if (!(bytes instanceof Uint8Array)) {
            throw new Error('Invalid bytes type.');
        }
        this.#bytes = bytes.slice(0);
        Object.freeze(this);
    }

    public toBase64(): string {
        return base64.encode(this.#bytes);
    }

    public toUint8Array(): Uint8Array {
        return this.#bytes.slice(0);
    }
}

Object.freeze(ImmutableBytes);
Object.freeze(ImmutableBytes.prototype);


export type SomeUnknown = NonNullable<unknown>;

interface OnceOptionState<T extends SomeUnknown> {
    value: T | undefined;
}

export class OnceOption<T extends SomeUnknown> {
    readonly #state: OnceOptionState<T> = {
        value: undefined,
    };

    public constructor() {
        Object.freeze(this);
    }

    public set(value: T): void {
        if (value === undefined || value === null) {
            throw new Error('Cannot set undefined or null.');
        }
        if (this.#state.value !== undefined) {
            throw new Error('Value already present.');
        }
        this.#state.value = value;
    }

    public get some(): T {
        if (this.#state.value === undefined) {
            throw new Error('No value.');
        }
        return this.#state.value;
    }

    public get none(): undefined {
        if (this.#state.value !== undefined) {
            throw new Error('Value already present.');
        }
        return undefined;
    }

    public get isSome(): boolean {
        return this.#state.value !== undefined;
    }

    public get isNone(): boolean {
        return this.#state.value === undefined;
    }
}
