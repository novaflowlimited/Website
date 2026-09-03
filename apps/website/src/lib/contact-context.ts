export const PROJECT_TYPE_OPTIONS = [
  { value: 'Business software', label: 'Business software' },
  { value: 'POS / Retail', label: 'POS / Retail' },
  { value: 'ISP / Connectivity', label: 'ISP / Connectivity' },
  { value: 'Aviation', label: 'Aviation' },
  { value: 'Pharmacy', label: 'Pharmacy' },
  { value: 'Automation', label: 'Automation' },
  { value: 'Custom system', label: 'Custom system' },
  { value: 'Other', label: 'Other' },
] as const;

export const BUDGET_OPTIONS = [
  { value: 'Not sure yet', label: 'Not sure yet' },
  { value: 'Under KES 100K', label: 'Under KES 100K' },
  { value: 'KES 100K–500K', label: 'KES 100K–500K' },
  { value: 'KES 500K–1M', label: 'KES 500K–1M' },
  { value: 'KES 1M+', label: 'KES 1M+' },
  { value: 'Prefer to discuss', label: 'Prefer to discuss' },
] as const;

export const TIMELINE_OPTIONS = [
  { value: 'ASAP', label: 'ASAP' },
  { value: '1–3 months', label: '1–3 months' },
  { value: '3–6 months', label: '3–6 months' },
  { value: '6+ months', label: '6+ months' },
  { value: 'Not sure', label: 'Not sure' },
] as const;

const PROJECT_CONTEXT_MAP: Record<string, string> = {
  bytepesa: 'ISP / Connectivity',
  techlane: 'POS / Retail',
  'apinai-air': 'Aviation',
  apinai: 'Aviation',
  retail: 'POS / Retail',
  pharmacy: 'Pharmacy',
  isp: 'ISP / Connectivity',
  aviation: 'Aviation',
  hospitality: 'Business software',
  'professional-services': 'Business software',
  automation: 'Automation',
  pos: 'POS / Retail',
  billing: 'ISP / Connectivity',
};

/** Map a ?project= query value (product/industry/case-study slug) to a form project type. */
export function resolveProjectTypeFromContext(project: string | null | undefined): string {
  if (!project) return '';
  const key = project.trim().toLowerCase();
  if (!key) return '';
  if (PROJECT_CONTEXT_MAP[key]) return PROJECT_CONTEXT_MAP[key];

  for (const [slug, type] of Object.entries(PROJECT_CONTEXT_MAP)) {
    if (key.includes(slug)) return type;
  }

  const match = PROJECT_TYPE_OPTIONS.find((option) => option.value.toLowerCase() === key);
  return match?.value ?? '';
}

export function contactHref(project?: string | null): string {
  if (!project) return '/contact';
  return `/contact?project=${encodeURIComponent(project)}`;
}
