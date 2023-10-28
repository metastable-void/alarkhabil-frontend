
import { Api } from "./api";
import * as urls from "./urls";
import { SiteConfig } from "./site-config";


export interface TimestampFormatResult {
    readonly datetime: string; // <time datetime="...">...</time>
    readonly formatted: string; // for display
}

export class FrontendApi {
    public readonly v1: Api;

    public constructor(frontendUrl = urls.resolve('/')) {
        this.v1 = new Api(urls.resolve('/frontend/api/v1/', frontendUrl));
    }

    public async getConfig(): Promise<SiteConfig> {
        const result = await this.v1.get<SiteConfig>('config/get');
        if (!result.ok) {
            throw new Error(`Failed to get config: ${result.status}`);
        }
        return result.data;
    }

    /**
     * Returns HTML text parsed from Markdown text.
     * @param markdown Markdown text to parse
     */
    public async parseMarkdown(markdown: string): Promise<string> {
        const result = await this.v1.post<
            { markdown_text: string },
            { html: string }
        >('markdown/parse', { markdown_text: markdown });
        if (!result.ok) {
            throw new Error(`Failed to parse markdown: ${result.status}`);
        }
        return result.data.html;
    }

    public async formatTimestampInSeconds(seconds: number): Promise<TimestampFormatResult> {
        const params = new URLSearchParams();
        params.set('timestamp', seconds.toString());
        const result = await this.v1.get<TimestampFormatResult>('timestamp/format', params);
        if (!result.ok) {
            throw new Error(`Failed to format timestamp: ${result.status}`);
        }
        return result.data;
    }
}
