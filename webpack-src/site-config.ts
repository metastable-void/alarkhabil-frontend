
import { deepFreeze } from "./freeze";

export interface NavigationItem {
    readonly url: string;
    readonly text: string;
}

export interface SiteConfig {
    readonly api_url: string;
    readonly site_name: string;
    readonly site_description: string;
    readonly site_copyright: string;
    readonly header_navigation: NavigationItem[];
    readonly footer_navigation: NavigationItem[];
    readonly top_url: string;
    readonly og_image: string;
    readonly server_timezone: string;
}

export namespace SiteConfig {
    export const INITIAL: SiteConfig = deepFreeze<SiteConfig>(JSON.parse(document.querySelector<HTMLMetaElement>('meta[name="site-config"]').content));
}
