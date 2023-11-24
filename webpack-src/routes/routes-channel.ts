
import { routerBuilder, commonHandler } from "../routes-common";
import { instantiateTemplate, content } from "../render";

routerBuilder.add('/c/', async (_routeParams) => {
    const channels = await alarkhabil.backendApi.channel.list();

    commonHandler(_routeParams, false, 'Channels');
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
        channelElement.querySelector<HTMLAnchorElement>('.channel-name-link')!.href = `/c/${channel.handle}/`;
        channelElement.querySelector<HTMLAnchorElement>('.channel-handle-link')!.href = `/c/${channel.handle}/`;
        channelElement.querySelector<HTMLElement>('.channel-name')!.textContent = channel.name;
        channelElement.querySelector<HTMLElement>('.channel-handle-value')!.textContent = channel.handle;
    }
});
