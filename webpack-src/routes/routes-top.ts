
import { routerBuilder, commonHandler } from "../routes-common";
import { instantiateTemplate, content } from "../template";
import { TimestampFormatResult } from "../frontend-api";
import '../alarkhabil';

routerBuilder.add('/', async (_routeParams) => {
    const posts = await alarkhabil.backendApi.post.list();
    const postTimestampMap = new Map<number, TimestampFormatResult>();
    for (const post of posts) {
        const timestampInSeconds = post.revisionDate;
        if (postTimestampMap.has(timestampInSeconds)) {
            continue;
        }
        const timestamp = await alarkhabil.frontendApi.formatTimestampInSeconds(timestampInSeconds);
        postTimestampMap.set(timestampInSeconds, timestamp);
    }

    commonHandler(_routeParams, false, undefined);
    content.textContent = '';
    const postListElement = instantiateTemplate('template-content-post-list', content);
    postListElement.querySelector('.post-list-title')!.textContent = 'Latest Posts';
    const postListItemsElement = postListElement.querySelector<HTMLElement>('.post-list-items')!;
    if (posts.length == 0) {
        const paragraph = instantiateTemplate('template-content-single-paragraph-message', postListItemsElement);
        paragraph.textContent = 'There is no post in this list.';
        return;
    }
    for (const post of posts) {
        const postElement = instantiateTemplate('template-content-post-list-item', postListItemsElement);
        postElement.querySelector<HTMLAnchorElement>('.post-channel-name-link')!.href = `/c/${post.channel!.handle}/`;
        postElement.querySelector<HTMLAnchorElement>('.post-channel-handle-link')!.href = `/c/${post.channel!.handle}/`;
        postElement.querySelector<HTMLElement>('.post-channel-name')!.textContent = post.channel!.name;
        postElement.querySelector<HTMLElement>('.post-channel-handle')!.textContent = post.channel!.handle;
        const postTitleLink = postElement.querySelector<HTMLAnchorElement>('.post-title-link')!;
        postTitleLink.href = `/c/${post.channel!.handle}/${post.postUuid}/`;
        postTitleLink.textContent = post.title;
        const postDateTimeElement = postElement.querySelector<HTMLTimeElement>('.post-date-time')!;
        const timestamp = postTimestampMap.get(post.revisionDate)!;
        postDateTimeElement.dateTime = timestamp.datetime;
        postDateTimeElement.textContent = timestamp.formatted;
        postElement.querySelector<HTMLAnchorElement>('.post-author-link')!.href = `/author/${post.author!.uuid}/`;
        postElement.querySelector<HTMLElement>('.post-author-name')!.textContent = post.author!.name;
        postElement.querySelector<HTMLElement>('.post-author-uuid')!.textContent = post.author!.uuid;
    }
});
