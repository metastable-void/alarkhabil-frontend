
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
