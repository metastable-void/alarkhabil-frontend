
export class PageMetadata {
    public static readonly DEFAULT_ROBOTS_TAG_ALLOW = 'index,follow,notranslate';
    public static readonly DEFAULT_ROBOTS_TAG_DENY = 'noindex,nofollow';

    public static getRobotsTag(): HTMLMetaElement {
        const tag = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
        if (!tag) {
            const tag = document.createElement('meta');
            tag.name = 'robots';
            tag.content = PageMetadata.DEFAULT_ROBOTS_TAG_ALLOW;
            document.head.appendChild(tag);
            return tag;
        }
        return tag;
    }

    public static set allowRobots(value: boolean) {
        PageMetadata.getRobotsTag().content = value ? PageMetadata.DEFAULT_ROBOTS_TAG_ALLOW : PageMetadata.DEFAULT_ROBOTS_TAG_DENY;
    }

    public static get allowRobots(): boolean {
        return PageMetadata.getRobotsTag().content !== PageMetadata.DEFAULT_ROBOTS_TAG_DENY;
    }

    public static get documentTitle(): string {
        return document.title;
    }

    public static set documentTitle(value: string) {
        document.title = value;
    }

    private static getOgTag(property: string): HTMLMetaElement {
        const tag = document.querySelector<HTMLMetaElement>(`meta[property="og:${property}"]`);
        if (!tag) {
            const tag = document.createElement('meta');
            tag.setAttribute('property', `og:${property}`);
            document.head.appendChild(tag);
            return tag;
        }
        return tag;
    }

    public static get ogUrl(): string {
        return PageMetadata.getOgTag('url').content;
    }

    public static set ogUrl(value: string) {
        PageMetadata.getOgTag('url').content = value;
    }

    public static get ogTitle(): string {
        return PageMetadata.getOgTag('title').content;
    }

    public static set ogTitle(value: string) {
        PageMetadata.getOgTag('title').content = value;
    }

    public static get ogSiteName(): string {
        return PageMetadata.getOgTag('site_name').content;
    }

    public static set ogSiteName(value: string) {
        PageMetadata.getOgTag('site_name').content = value;
    }
}

Object.freeze(PageMetadata);
