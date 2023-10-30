
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
}

Object.freeze(PageMetadata);
