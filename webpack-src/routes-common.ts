
import { Router, RouteHandler, ErrorRouteHandler, RouteParams } from './router';
import { PageMetadata } from './page-metadata';
import { instantiateTemplate, content } from "./render";
import './alarkhabil';

export const routerBuilder: Router.Builder = new Router.Builder();

export const commonHandler = (params: RouteParams, isError: boolean, title = '') => {
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

export const handlerNotFound: RouteHandler = (params) => {
    commonHandler(params, true, 'Not Found');
    content.textContent = '';
    content.appendChild(document.createElement('h1')).textContent = '404: Not Found';
};

export const errorHandler: ErrorRouteHandler = (params, error) => {
    commonHandler(params, true, 'Error');
    content.textContent = '';
    content.appendChild(document.createElement('h1')).textContent = 'Error';
    content.appendChild(document.createElement('pre')).textContent = String(error);
};

routerBuilder.setFallbackHandler(handlerNotFound);
routerBuilder.setErrorHandler(errorHandler);
