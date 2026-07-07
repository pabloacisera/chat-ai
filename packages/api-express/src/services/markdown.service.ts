import { marked } from 'marked';

export function markdownToHTML(text: string): string {
  if (!text || typeof text !== 'string') return text;

  const result = marked.parse(text, { async: false }) as string;
  return result;
}
