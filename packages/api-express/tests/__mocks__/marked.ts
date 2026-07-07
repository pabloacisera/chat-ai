function parse(text: string, options?: { async?: boolean }): string {
  if (!text) return text;
  return `<p>${text}</p>`;
}

export { parse };
export const marked = { parse };
