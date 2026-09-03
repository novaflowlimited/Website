type AnalyticsPayload = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    novaflowAnalytics?: {
      track?: (event: string, payload?: AnalyticsPayload) => void;
    };
  }
}

/** Lightweight analytics hooks — no vendor required. Ready for later wiring. */
export function trackContactEvent(event: string, payload: AnalyticsPayload = {}): void {
  if (typeof window === 'undefined') return;

  const detail = { event, ...payload, ts: Date.now() };

  try {
    window.novaflowAnalytics?.track?.(event, detail);
  } catch {
    // ignore analytics failures
  }

  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(detail);
  } catch {
    // ignore
  }

  try {
    window.dispatchEvent(new CustomEvent('novaflow:analytics', { detail }));
  } catch {
    // ignore
  }
}
