
export const instantiateTemplate = (templateId: string, parentElement: HTMLElement): HTMLElement => {
    const templateElement = document.getElementById(templateId) as HTMLTemplateElement;
    if (!templateElement || !(templateElement instanceof HTMLTemplateElement)) {
        throw new Error(`Template element not found: ${templateId}`);
    }
    const clone = document.importNode(templateElement.content, true);
    const templateContent = clone.firstElementChild as HTMLElement;
    if (!templateContent) {
        throw new Error(`Template content not found: ${templateId}`);
    }
    console.assert(templateContent.classList.contains('template-content'));
    parentElement.appendChild(clone);
    return templateContent;
};

export const content = document.getElementById('content') as HTMLElement;

export const parseHTML = (html: string): DocumentFragment => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const fragment = document.createDocumentFragment();
    while (doc.body.firstChild) {
        fragment.appendChild(doc.body.firstChild);
    }
    return fragment;
};
