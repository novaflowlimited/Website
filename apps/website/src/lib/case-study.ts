import type { CaseStudyShot } from '../lib/api';

export function padWorkIndex(index: number): string {
  return String(index + 1).padStart(2, '0');
}

export function folioLayout(index: number, hasVisual: boolean): 'span' | 'image-left' | 'image-right' | 'type' {
  if (!hasVisual) return 'type';
  const layouts = ['image-right', 'image-left', 'span'] as const;
  return layouts[index % 3];
}

export function groupEvidence(shots: CaseStudyShot[]): Array<{ type: 'full' | 'detail' | 'pair'; items: CaseStudyShot[] }> {
  const groups: Array<{ type: 'full' | 'detail' | 'pair'; items: CaseStudyShot[] }> = [];
  let i = 0;
  while (i < shots.length) {
    const current = shots[i];
    if (current.treatment === 'pair' && shots[i + 1]) {
      groups.push({ type: 'pair', items: [current, shots[i + 1]] });
      i += 2;
      continue;
    }
    groups.push({ type: current.treatment === 'detail' ? 'detail' : 'full', items: [current] });
    i += 1;
  }
  return groups;
}
