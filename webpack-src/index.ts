
import { Router, RouteHandler, ErrorRouteHandler, RouteParams } from './router';
import { PageMetadata } from './page-metadata';
import './alarkhabil';

const routerBuilder: Router.Builder = new Router.Builder();

const commonHandler = (params: RouteParams, isError: boolean, title = '') => {
    if (isError) {
        PageMetadata.allowRobots = false; // Disallow robots from indexing this page. (404 alternative)
    } else {
        PageMetadata.allowRobots = true; // Allow robots to index this page.
    }

    const documentTitle = title == '' ? alarkhabil.siteConfig.site_name : `${title} - ${alarkhabil.siteConfig.site_name}`;
    const ogTitle = title == '' ? alarkhabil.siteConfig.site_name : title;

    PageMetadata.documentTitle = documentTitle;
    const url = new URL(params.matchedPath, document.location.href);
    PageMetadata.ogUrl = url.href;
    PageMetadata.ogTitle = ogTitle;
};

const handlerNotFound: RouteHandler = (params) => {
    commonHandler(params, true, 'Not Found');
};

const errorHandler: ErrorRouteHandler = (params, error) => {
    commonHandler(params, true, 'Error');
};

routerBuilder.setFallbackHandler(handlerNotFound);
routerBuilder.setErrorHandler(errorHandler);

const router = routerBuilder.build();

const navigate = (url: string) => {
    const parsedUrl = new URL(url, document.location.href);
    if (parsedUrl.origin !== document.location.origin) {
        console.warn('Invalid navigation:', parsedUrl.href);
        return;
    }
    const targetUrl = parsedUrl.href;
    history.pushState(null, '', targetUrl);
    router.handle(parsedUrl.pathname, parsedUrl.search);
};

document.addEventListener ('click', ev => {
    const composedPath = ev.composedPath();
    for (let target of composedPath) {
        if (!('tagName' in target) || typeof target.tagName != 'string' || 'a' !== target.tagName.toLowerCase()) {
            continue;
        }
        const anchor = target as HTMLAnchorElement;
        if (!anchor.href) {
            continue;
        }
        ev.preventDefault();
        const action = new URL(anchor.href, location.href);
        if (action.origin !== location.origin) {
            console.log('external link followed:', action.href);
            window.open(action.href, '_blank');
        } else {
            console.log('internal link followed:', action.href);
            navigate(action.href);
        }
        return;
    }
});
