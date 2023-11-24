
import './alarkhabil';
import { routerBuilder } from './routes-common';
import './routes';


const router = routerBuilder.build();

// routes not prerendered by the server
const JS_HANDLED_PATHNAMES: string[] = [
    '/invites/',
    '/signup/',
    '/signin/',
    '/account/',
];

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

window.addEventListener('popstate', _ev => {
    const url = new URL(document.location.href);
    router.handle(url.pathname, url.search);
});

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

if (JS_HANDLED_PATHNAMES.includes(document.location.pathname)) {
    router.handle(document.location.pathname, document.location.search);
}
