import { Marked } from "marked";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const SAFE_HREF = /^(https?:|mailto:|\/|#)/i;

/**
 * Markdown → HTML for AI chat replies. Raw HTML in the reply is shown as text
 * and only http(s)/mailto/relative links are kept, so a prompt-injected reply
 * cannot run script in the reader's session.
 */
const aiMarked = new Marked({
  async: false,
  renderer: {
    html: ({ text }) => escapeHtml(text),
    link({ href, tokens }) {
      const label = this.parser.parseInline(tokens);
      if (!SAFE_HREF.test(href)) return label;
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    },
    image: ({ text }) => escapeHtml(text),
  },
});

export function renderAiMarkdown(content: string): string {
  return aiMarked.parse(content) as string;
}
