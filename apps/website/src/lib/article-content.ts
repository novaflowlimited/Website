import { parseInlineTokens, type InlineToken } from '@novaflow/validation';

export type { InlineToken };
export { parseInlineTokens };

export function formatInsightDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function padIndex(index: number): string {
  return String(index + 1).padStart(2, '0');
}

export function articleSrcSet(url: string): string | undefined {
  if (!url || url.startsWith('data:')) return undefined;
  return `${url} 1600w`;
}
