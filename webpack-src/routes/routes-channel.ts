
import { routerBuilder, commonHandler } from "../routes-common";
import { instantiateTemplate, content, parseHTML } from "../render";
import { DnsToken } from "../dns-token";
import { TimestampFormatResult } from "../frontend-api";

routerBuilder.add('/c/', async (routeParams) => {
    const channels = await alarkhabil.backendApi.channel.list();

    commonHandler(routeParams, false, 'Channels');
    content.textContent = '';
    const postListElement = instantiateTemplate('template-content-post-list', content);
    postListElement.querySelector('.post-list-title')!.textContent = 'Channels';
    const postListItemsElement = postListElement.querySelector<HTMLElement>('.post-list-items')!;
    if (channels.length == 0) {
        const paragraph = instantiateTemplate('template-content-single-paragraph-message', postListItemsElement);
        paragraph.textContent = 'There is no channel in this list.';
        return;
    }
    for (const channel of channels) {
        const channelElement = instantiateTemplate('template-content-channel-list-item', postListItemsElement);
        channelElement.lang = channel.lang;
        channelElement.querySelector<HTMLAnchorElement>('.channel-name-link')!.href = `/c/${channel.handle}/`;
        channelElement.querySelector<HTMLAnchorElement>('.channel-handle-link')!.href = `/c/${channel.handle}/`;
        channelElement.querySelector<HTMLElement>('.channel-name')!.textContent = channel.name;
        channelElement.querySelector<HTMLElement>('.channel-handle-value')!.textContent = channel.handle;
    }
});

routerBuilder.add('/c/:channelHandle/', async (routeParams) => {
    const channelHandle = DnsToken(routeParams.placeholders.get('channelHandle')!);
    const channel = await alarkhabil.backendApi.channel.getByHandle(channelHandle);
    const channelUuid = channel.uuid;
    const posts = await alarkhabil.backendApi.post.listByChannel(channelUuid);
    const channelDescriptionHtml = await alarkhabil.frontendApi.parseMarkdown(channel.descriptionText);
    const timestampMap = new Map<number, TimestampFormatResult>();
    for (const post of posts) {
        const timestampInSeconds = post.revisionDate;
        if (timestampMap.has(timestampInSeconds)) {
            continue;
        }
        const timestamp = await alarkhabil.frontendApi.formatTimestampInSeconds(timestampInSeconds);
        timestampMap.set(timestampInSeconds, timestamp);
    }
    const timestamp = await alarkhabil.frontendApi.formatTimestampInSeconds(channel.createdDate);
    timestampMap.set(channel.createdDate, timestamp);

    commonHandler(routeParams, false, channel.name);
    content.textContent = '';
    const channelElement = instantiateTemplate('template-content-channel', content);
    channelElement.lang = channel.lang;
    channelElement.querySelector<HTMLElement>('.breadcrumbs-channel-handle')!.textContent = channel.handle;
    channelElement.querySelector<HTMLElement>('.channel-name')!.textContent = channel.name;
    channelElement.querySelector<HTMLElement>('.channel-handle-value')!.textContent = channel.handle;
    const channelDateTime = channelElement.querySelector<HTMLTimeElement>('.channel-date-time')!;
    channelDateTime.dateTime = timestamp.datetime;
    channelDateTime.textContent = timestamp.formatted;
    channelElement.querySelector<HTMLElement>('.channel-description')!.appendChild(parseHTML(channelDescriptionHtml));
    const channelPostsElement = channelElement.querySelector<HTMLElement>('.channel-posts-items')!;
    if (posts.length == 0) {
        const paragraph = instantiateTemplate('template-content-single-paragraph-message', channelPostsElement);
        paragraph.textContent = 'There is no post in this channel.';
        return;
    }
    for (const post of posts) {
        const postElement = instantiateTemplate('template-content-post-list-item', channelPostsElement);
        postElement.lang = channel.lang;
        postElement.querySelector<HTMLAnchorElement>('.post-channel-name-link')!.href = `/c/${channel!.handle}/`;
        postElement.querySelector<HTMLAnchorElement>('.post-channel-handle-link')!.href = `/c/${channel!.handle}/`;
        postElement.querySelector<HTMLElement>('.post-channel-name')!.textContent = channel!.name;
        postElement.querySelector<HTMLElement>('.post-channel-handle')!.textContent = channel!.handle;
        postElement.querySelector<HTMLAnchorElement>('.post-title-link')!.href = `/c/${channel.handle}/${post.postUuid}/`;
        postElement.querySelector<HTMLElement>('.post-title-link')!.textContent = post.title;
        const postDateTimeElement = postElement.querySelector<HTMLTimeElement>('.post-date-time')!;
        const timestamp = timestampMap.get(post.revisionDate)!;
        postDateTimeElement.dateTime = timestamp.datetime;
        postDateTimeElement.textContent = timestamp.formatted;
        postElement.querySelector<HTMLAnchorElement>('.post-author-link')!.href = `/author/${post.author!.uuid}/`;
        postElement.querySelector<HTMLElement>('.post-author-name')!.textContent = post.author!.name;
        postElement.querySelector<HTMLElement>('.post-author-uuid')!.textContent = post.author!.uuid;
    }
});
