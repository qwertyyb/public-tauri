import MarkdownIt from 'markdown-it';

let instance: MarkdownIt | null = null;

export function getDefaultMarkdownIt(): MarkdownIt {
  if (!instance) {
    instance = new MarkdownIt({ html: false, linkify: true, breaks: true });
  }
  return instance;
}

export function renderMarkdown(source: string): string {
  return getDefaultMarkdownIt().render(source);
}
