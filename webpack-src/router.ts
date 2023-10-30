
export type LiteralPathSegment = {
    readonly type: 'literal';
    readonly specifity: 2;
    readonly value: string;
};

export function LiteralPathSegment(value: string): LiteralPathSegment {
    if ('' == value) {
        throw new Error('Empty literal path segment.');
    }
    if (value.includes('/') || value.startsWith(':')) {
        throw new Error('Invalid literal path segment.');
    }
    return { type: 'literal', specifity: 2, value };
}

export type PlaceholderPathSegment = {
    readonly type: 'placeholder';
    readonly specifity: 1;
    readonly name: string;
};

export function PlaceholderPathSegment(name: string): PlaceholderPathSegment {
    if ('' == name) {
        throw new Error('Empty placeholder name.');
    }
    return { type: 'placeholder', specifity: 1, name };
}

export type EmptyPathSegment = {
    readonly type: 'empty';
    readonly specifity: 0;
};

export function EmptyPathSegment(): EmptyPathSegment {
    return { type: 'empty', specifity: 0 };
}

export type PathSegment = (LiteralPathSegment | PlaceholderPathSegment | EmptyPathSegment) & {
    readonly type: 'literal' | 'placeholder' | 'empty';
    readonly specifity: number;
};

export function PathSegment(rawValue: string): PathSegment {
    if (rawValue === '') {
        return EmptyPathSegment();
    }
    if (rawValue.startsWith(':')) {
        return PlaceholderPathSegment(rawValue.slice(1));
    }
    return LiteralPathSegment(rawValue);
}

export type ParsedRoute = {
    readonly path: string;
    readonly placeholders: string[]; // ['bar'] for '/foo/:bar'
    readonly segments: PathSegment[];
};

export function ParsedRoute(pattern: string): ParsedRoute {
    pattern = String(pattern);
    if (!pattern.startsWith('/')) {
        throw new Error('Route pattern must start with a slash.');
    }
    pattern = pattern.slice(1);
    pattern = pattern.replaceAll(/\/+/g, '/'); // remove duplicate slashes
    const segments = pattern.split('/').map(PathSegment);
    const placeholders = segments.filter((segment): segment is PlaceholderPathSegment => {
        return segment.type === 'placeholder';
    }).map((segment) => segment.name);
    const placeholdersSet = new Set(placeholders);
    if (placeholdersSet.size !== placeholders.length) {
        throw new Error('Duplicate placeholders.');
    }
    return {
        path: pattern,
        placeholders,
        segments,
    };
}

export namespace ParsedRoute {
    export const getIdentifier = (parsedRoute: ParsedRoute): string => {
        return parsedRoute.segments.map((segment) => {
            if (segment.type === 'literal') {
                return segment.value;
            }
            if (segment.type === 'placeholder') {
                return `:`;
            }
            return '';
        }).join('/');
    };
}

export class RouteParams {
    public readonly matchedPath: string;
    public readonly searchParams: URLSearchParams;
    public readonly placeholders: ReadonlyMap<string, string>;

    public constructor(matchedPath: string, search: string, placeholders: ReadonlyMap<string, string>) {
        this.matchedPath = matchedPath;
        this.searchParams = new URLSearchParams(search);
        this.placeholders = placeholders;
        Object.freeze(this);
    }
}

Object.freeze(RouteParams);
Object.freeze(RouteParams.prototype);

export type RouteHandler = (params: RouteParams) => void;

export type ErrorRouteHandler = (params: RouteParams, error: unknown) => void;

export type Route = {
    readonly parsedRoute: ParsedRoute;
    readonly handler: RouteHandler;
};

export namespace Route {
    export const sort = (routes: readonly Route[]): Route[] => {
        return [...routes].sort((a, b) => {
            const aSpecifities = a.parsedRoute.segments.map((segment) => segment.specifity);
            const bSpecifities = b.parsedRoute.segments.map((segment) => segment.specifity);
            const minLength = Math.min(aSpecifities.length, bSpecifities.length);
            for (let i = 0; i < minLength; i++) {
                const aSpecifity = aSpecifities[i];
                const bSpecifity = bSpecifities[i];
                if (aSpecifity !== bSpecifity) {
                    return bSpecifity - aSpecifity;
                }
            }
            return bSpecifities.length - aSpecifities.length;
        });
    };
}

type MatchedRoute = {
    readonly params: RouteParams;
    readonly route: Route;
};

export class Router {
    // inner class
    public static readonly Builder = class Builder {
        readonly #routes: Route[] = [];
        readonly #routeIdSet: Set<string> = new Set();
        #fallbackHandler: RouteHandler | null = null;
        #errorHandler: ErrorRouteHandler | null = null;
    
        public add(pattern: string, handler: RouteHandler): Builder {
            const parsedRoute = ParsedRoute(pattern);
            const routeId = ParsedRoute.getIdentifier(parsedRoute);
            if (this.#routeIdSet.has(routeId)) {
                throw new Error(`Duplicate route: ${pattern}`);
            }
            this.#routeIdSet.add(routeId);
            this.#routes.push({
                parsedRoute,
                handler,
            });
            return this;
        }

        public setFallbackHandler(handler: RouteHandler): Builder {
            if (typeof this.#fallbackHandler === 'function') {
                throw new Error('Fallback handler is already set.');
            }
            if (typeof handler !== 'function') {
                throw new Error('Fallback handler must be a function.');
            }
            this.#fallbackHandler = handler;
            return this;
        }

        public setErrorHandler(handler: ErrorRouteHandler): Builder {
            if (typeof this.#errorHandler === 'function') {
                throw new Error('Error handler is already set.');
            }
            if (typeof handler !== 'function') {
                throw new Error('Error handler must be a function.');
            }
            this.#errorHandler = handler;
            return this;
        }
    
        public build(): Router {
            return new Router(Route.sort(this.#routes), this.#fallbackHandler, this.#errorHandler);
        }
    };

    readonly #routes: readonly Route[];
    readonly #fallbackHandler: RouteHandler | null;
    readonly #errorHandler: ErrorRouteHandler | null;

    private constructor(routes: readonly Route[], fallbackHandler: RouteHandler | null = null, errorHandler: ErrorRouteHandler | null = null) {
        this.#routes = routes;
        this.#fallbackHandler = fallbackHandler;
        this.#errorHandler = errorHandler;
        Object.freeze(this);
    }

    #parsePathname(pathname: string): string[] {
        if (!pathname.startsWith('/')) {
            throw new Error('Pathname must start with a slash.');
        }
        pathname = pathname.slice(1);
        pathname = pathname.replaceAll(/\/+/g, '/'); // remove duplicate slashes
        return pathname.split('/');
    }

    #match(pathname: string, search: string): MatchedRoute | null {
        const pathnameParts = this.#parsePathname(pathname);
        for (const route of this.#routes) {
            const { segments } = route.parsedRoute;
            if (segments.length != pathnameParts.length) {
                continue;
            }
            const matchedPlaceholders = new Map<string, string>();
            let matched = true;
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                const part = pathnameParts[i];
                if (segment.type === 'literal') {
                    if (segment.value !== part) {
                        matched = false;
                        break;
                    }
                } else if (segment.type === 'placeholder') {
                    matchedPlaceholders.set(segment.name, part);
                } else if (segment.type === 'empty') {
                    console.assert(i == segments.length - 1);
                    if (part !== '') {
                        matched = false;
                        break;
                    }
                } else {
                    throw new Error('Unknown path segment type.');
                }
            }
            if (!matched) {
                continue;
            }
            const params = new RouteParams(pathname, search, matchedPlaceholders);
            return { params, route };
        }
        return null;
    }

    #callHandler(handler: RouteHandler, params: RouteParams): void {
        try {
            const promise = Promise.resolve(handler(params)); // throws if synchronously throws
            // if async, catch the error and log it
            promise.catch((e) => {
                console.error('Route handler asynchronously throwed:', e);
                if (this.#errorHandler != null) {
                    this.#callErrorHandler(this.#errorHandler, params, e);
                }
            });
        } catch (e) {
            console.error('Route handler synchronously throwed:', e);
            if (this.#errorHandler != null) {
                this.#callErrorHandler(this.#errorHandler, params, e);
            } else {
                throw e;
            }
        }
    }
    
    #callErrorHandler(handler: ErrorRouteHandler, params: RouteParams, error: unknown): void {
        try {
            const promise = Promise.resolve(handler(params, error)); // throws if synchronously throws
            // if async, catch the error and log it
            promise.catch((e) => {
                console.error('Error route handler asynchronously throwed:', e);
            });
        } catch (e) {
            console.error('Error route handler synchronously throwed:', e);
        }
    }

    public handle(pathname: string, search: string): void {
        const matchedRoute = this.#match(pathname, search);
        if (matchedRoute == null && this.#fallbackHandler != null) {
            this.#callHandler(this.#fallbackHandler, new RouteParams(pathname, search, new Map()));
            return;
        } else if (matchedRoute == null) {
            throw new Error(`No route matches and there is no fallback handler registered: ${pathname}`);
        }
        const { params, route } = matchedRoute;
        this.#callHandler(route.handler, params);
    }
}

export namespace Router {
    export type Builder = InstanceType<typeof Router.Builder>;
}

Object.freeze(Router);
Object.freeze(Router.prototype);
Object.freeze(Router.Builder);
Object.freeze(Router.Builder.prototype);
