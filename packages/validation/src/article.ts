import { z } from 'zod';

const uuidSchema = z.string().uuid();

export const articleInlineLinkRe = /\[([^\]]+)\]\(([^)]+)\)/g;

export function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed || trimmed.length > 2000) return false;
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function stripUnsafeText(input: string, max = 20000): string {
  return input
    // Strip C0 controls except tab/LF/CR for safe plain text storage.
    // eslint-disable-next-line no-control-regex -- intentional control-char sanitization
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/<[^>]*>/g, '')
    .slice(0, max);
}

export const articleHeadingBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.literal('heading'),
  level: z.union([z.literal(2), z.literal(3)]),
  text: z.string().max(400),
});

export const articleParagraphBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.literal('paragraph'),
  text: z.string().max(20000),
});

export const articleQuoteBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.literal('quote'),
  text: z.string().max(4000),
  attribution: z.string().max(200).optional().nullable(),
});

export const articleListBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.literal('list'),
  ordered: z.boolean(),
  items: z.array(z.string().max(2000)).max(50),
});

export const articleCodeBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.literal('code'),
  language: z.string().max(40).optional().nullable(),
  code: z.string().max(20000),
});

export const articleImageBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.literal('image'),
  mediaId: uuidSchema,
  caption: z.string().max(400).optional().nullable(),
  layout: z.enum(['inline', 'full']).default('inline'),
});

export const articleTableBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.literal('table'),
  headers: z.array(z.string().max(200)).max(12),
  rows: z.array(z.array(z.string().max(500)).max(12)).max(40),
});

export const articleBlockSchema = z.discriminatedUnion('type', [
  articleHeadingBlockSchema,
  articleParagraphBlockSchema,
  articleQuoteBlockSchema,
  articleListBlockSchema,
  articleCodeBlockSchema,
  articleImageBlockSchema,
  articleTableBlockSchema,
]);

export const articleDocumentSchema = z.object({
  blocks: z.array(articleBlockSchema).max(200),
});

export type ArticleDocumentInput = z.infer<typeof articleDocumentSchema>;

export function sanitizeHref(href: string): string | null {
  const trimmed = href.trim();
  if (!isSafeHref(trimmed)) return null;
  return trimmed;
}

export function sanitizeInlineText(text: string, max = 20000): string {
  const cleaned = stripUnsafeText(text, max);
  return cleaned.replace(articleInlineLinkRe, (_match, label: string, href: string) => {
    const safeHref = sanitizeHref(href);
    const safeLabel = stripUnsafeText(label, 400);
    if (!safeHref || !safeLabel) return safeLabel;
    return `[${safeLabel}](${safeHref})`;
  });
}

export function sanitizeArticleDocument(input: unknown): ArticleDocumentInput {
  const parsed = articleDocumentSchema.safeParse(input);
  const source = parsed.success ? parsed.data : { blocks: [] };

  return {
    blocks: source.blocks.map((block) => {
      switch (block.type) {
        case 'heading':
          return { ...block, text: stripUnsafeText(block.text, 400) };
        case 'paragraph':
          return { ...block, text: sanitizeInlineText(block.text) };
        case 'quote':
          return {
            ...block,
            text: stripUnsafeText(block.text, 4000),
            attribution: block.attribution ? stripUnsafeText(block.attribution, 200) : null,
          };
        case 'list':
          return { ...block, items: block.items.map((item) => sanitizeInlineText(item, 2000)).filter(Boolean) };
        case 'code':
          return {
            ...block,
            language: block.language ? stripUnsafeText(block.language, 40).replace(/[^a-z0-9+-]/gi, '') : null,
            code: block.code.slice(0, 20000),
          };
        case 'image':
          return {
            ...block,
            caption: block.caption ? stripUnsafeText(block.caption, 400) : null,
          };
        case 'table':
          return {
            ...block,
            headers: block.headers.map((cell) => stripUnsafeText(cell, 200)),
            rows: block.rows.map((row) => row.map((cell) => stripUnsafeText(cell, 500))),
          };
        default:
          return block;
      }
    }),
  };
}

export function articlePlainText(doc: { blocks?: ArticleDocumentInput['blocks'] } | null | undefined): string {
  if (!doc?.blocks?.length) return '';
  const parts: string[] = [];
  for (const block of doc.blocks) {
    switch (block.type) {
      case 'heading':
      case 'paragraph':
      case 'quote':
        parts.push(block.text);
        break;
      case 'list':
        parts.push(block.items.join(' '));
        break;
      case 'code':
        parts.push(block.code);
        break;
      case 'image':
        if (block.caption) parts.push(block.caption);
        break;
      case 'table':
        parts.push([...block.headers, ...block.rows.flat()].join(' '));
        break;
      default:
        break;
    }
  }
  return parts.join(' ').replace(articleInlineLinkRe, '$1');
}

export function readingTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export type InlineToken = { type: 'text'; value: string } | { type: 'link'; value: string; href: string };

export function parseInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const href = sanitizeHref(match[2] ?? '');
    if (href) {
      tokens.push({ type: 'link', value: match[1] ?? '', href });
    } else {
      tokens.push({ type: 'text', value: match[1] ?? '' });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return tokens.length > 0 ? tokens : [{ type: 'text', value: text }];
}

export function collectArticleMediaIds(doc: { blocks?: ArticleDocumentInput['blocks'] } | null | undefined): string[] {
  if (!doc?.blocks) return [];
  return doc.blocks.filter((block): block is Extract<ArticleDocumentInput['blocks'][number], { type: 'image' }> => block.type === 'image').map((block) => block.mediaId);
}
