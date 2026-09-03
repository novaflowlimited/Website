import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Layout } from '../../components/Layout';
import { LoadingState, ErrorState, FormSection } from '../../components/EmptyState';
import { MediaPicker } from '../../components/MediaPicker';
import { useToast } from '../../components/ToastProvider';
import type { SiteSettings } from '../../types';

export function SiteSettingsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState<Partial<SiteSettings>>({ companyName: '', contactEmail: '', contactPhone: '', address: '', socialLinks: {} });

  const query = useQuery({ queryKey: ['site-settings'], queryFn: () => api.getSiteSettings() });
  useEffect(() => { if (query.data) setForm(query.data); }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<SiteSettings>) => api.updateSiteSettings(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['site-settings'] }); toast.success('Settings saved successfully.'); },
    onError: (err: Error) => toast.error(err.message),
  });

  if (query.isLoading) return <Layout title="Site Settings"><LoadingState /></Layout>;
  if (query.isError) return <Layout title="Site Settings"><ErrorState message="Unable to load settings." /></Layout>;
  const update = (field: keyof SiteSettings, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));

  const socialLinks = form.socialLinks ?? {};
  const updateSocialLink = (key: string, value: string) => update('socialLinks', { ...socialLinks, [key]: value });

  return (
    <Layout title="Site Settings">
      <div className="cms-editor-actions">
        <button className="cms-button cms-button--primary" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : 'Save Settings'}</button>
      </div>
      <FormSection title="General">
        <label className="cms-field"><span className="cms-field__label">Company Name</span><input className="cms-input" value={form.companyName ?? ''} onChange={(e) => update('companyName', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">Logo</span><MediaPicker value={form.logoMediaId ?? null} onChange={(v) => update('logoMediaId', v)} /></label>
        <label className="cms-field"><span className="cms-field__label">Favicon</span><MediaPicker value={form.faviconMediaId ?? null} onChange={(v) => update('faviconMediaId', v)} /></label>
      </FormSection>
      <FormSection title="Contact">
        <label className="cms-field"><span className="cms-field__label">Email</span><input className="cms-input" value={form.contactEmail ?? ''} onChange={(e) => update('contactEmail', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">Phone</span><input className="cms-input" value={form.contactPhone ?? ''} onChange={(e) => update('contactPhone', e.target.value)} /></label>
        <label className="cms-field"><span className="cms-field__label">Location</span><input className="cms-input" value={form.address ?? ''} onChange={(e) => update('address', e.target.value)} /></label>
      </FormSection>
      <FormSection title="Social">
        <label className="cms-field"><span className="cms-field__label">LinkedIn</span><input className="cms-input" value={socialLinks.linkedin ?? ''} onChange={(e) => updateSocialLink('linkedin', e.target.value)} placeholder="https://linkedin.com/company/…" /></label>
        <label className="cms-field"><span className="cms-field__label">Instagram</span><input className="cms-input" value={socialLinks.instagram ?? ''} onChange={(e) => updateSocialLink('instagram', e.target.value)} placeholder="https://instagram.com/…" /></label>
        <label className="cms-field"><span className="cms-field__label">X (Twitter)</span><input className="cms-input" value={socialLinks.x ?? ''} onChange={(e) => updateSocialLink('x', e.target.value)} placeholder="https://x.com/…" /></label>
      </FormSection>
    </Layout>
  );
}
