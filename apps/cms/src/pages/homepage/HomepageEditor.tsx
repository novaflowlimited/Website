import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Layout } from '../../components/Layout';
import {
  LoadingState,
  ErrorState,
  StatusBadge,
  ConfirmDialog,
  FormSection,
} from '../../components/EmptyState';
import { MediaPicker } from '../../components/MediaPicker';
import { useToast } from '../../components/ToastProvider';
import type {
  HomepageContent,
  Capability,
  Product,
  Industry,
  CaseStudy,
} from '../../types';

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL ?? 'http://localhost:4321';

type SectionKey = keyof HomepageContent;

const SECTION_CHANGE_LABELS: Record<SectionKey, string> = {
  hero: 'Hero',
  whatWeBuild: 'What We Build',
  products: 'Products',
  forBusiness: 'For Business',
  work: 'Work',
  about: 'About',
  contact: 'Contact',
};

const SECTION_META: Array<{ key: SectionKey; label: string; number: string }> = [
  { key: 'hero', label: 'Hero', number: '01' },
  { key: 'whatWeBuild', label: 'What We Build', number: '02' },
  { key: 'products', label: 'Products', number: '03' },
  { key: 'forBusiness', label: 'For Business', number: '04' },
  { key: 'work', label: 'Work', number: '05' },
  { key: 'about', label: 'About', number: '06' },
  { key: 'contact', label: 'Contact', number: '07' },
];

function linesToArray(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

function arrayToLines(items: string[]): string {
  return items.join('\n');
}

function singleMediaId(value: string | string[] | null): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function sectionSummary(key: SectionKey, content: HomepageContent): string {
  const section = content[key];
  if (!section.visible) return 'Hidden';
  switch (key) {
    case 'hero':
      return `${content.hero.headlineLine1} ${content.hero.headlineLine2}`.trim();
    case 'whatWeBuild':
      return `${content.whatWeBuild.capabilityIds.length} capabilities`;
    case 'products':
      return `${content.products.featuredProductIds.length} featured products`;
    case 'forBusiness':
      return `${content.forBusiness.featuredIndustryIds.length} featured industries`;
    case 'work':
      return `${content.work.featuredCaseStudyIds.length} featured case studies`;
    case 'about':
      return content.about.headlineLines[0] ?? 'About';
    case 'contact':
      return content.contact.headline;
    default:
      return '';
  }
}

function OrderedPicker({
  label,
  ids,
  options,
  max,
  onChange,
}: {
  label: string;
  ids: string[];
  options: Array<{ id: string; name: string; meta?: string }>;
  max: number;
  onChange: (ids: string[]) => void;
}) {
  const selected = ids
    .map((id) => options.find((option) => option.id === id))
    .filter((option): option is { id: string; name: string; meta?: string } => Boolean(option));
  const available = options.filter((option) => !ids.includes(option.id));

  const move = (index: number, direction: -1 | 1) => {
    const next = [...ids];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="cms-field">
      <span className="cms-field__label">{label}</span>
      <div className="cms-ordered-list">
        {selected.map((item, index) => (
          <div key={item.id} className="cms-ordered-list__item">
            <span className="cms-ordered-list__label">{item.name}</span>
            {item.meta && <span className="cms-ordered-list__meta">{item.meta}</span>}
            <div className="cms-table__actions">
              <button type="button" className="cms-button cms-button--sm" onClick={() => move(index, -1)} disabled={index === 0}>↑</button>
              <button type="button" className="cms-button cms-button--sm" onClick={() => move(index, 1)} disabled={index === selected.length - 1}>↓</button>
              <button
                type="button"
                className="cms-button cms-button--sm cms-button--danger"
                onClick={() => onChange(ids.filter((id) => id !== item.id))}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      {available.length > 0 && ids.length < max && (
        <select
          className="cms-input"
          value=""
          onChange={(e) => {
            if (e.target.value) onChange([...ids, e.target.value]);
          }}
        >
          <option value="">Add item…</option>
          {available.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      )}
      <small className="cms-field__hint">{ids.length}/{max} selected</small>
    </div>
  );
}

function VisibilityToggle({
  visible,
  onChange,
}: {
  visible: boolean;
  onChange: (visible: boolean) => void;
}) {
  return (
    <label className="cms-field cms-field--inline">
      <input type="checkbox" checked={visible} onChange={(e) => onChange(e.target.checked)} />
      <span>Section visible on homepage</span>
    </label>
  );
}

export function HomepageEditor() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<HomepageContent | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const editorQuery = useQuery({ queryKey: ['homepage-editor'], queryFn: () => api.getHomepageEditor() });
  const capabilitiesQuery = useQuery({
    queryKey: ['capabilities', 'homepage'],
    queryFn: () => api.getCapabilities({ status: 'published', limit: 100 }),
  });
  const productsQuery = useQuery({
    queryKey: ['products', 'homepage'],
    queryFn: () => api.getProducts({ status: 'published', limit: 100 }),
  });
  const industriesQuery = useQuery({
    queryKey: ['industries', 'homepage'],
    queryFn: () => api.getIndustries({ status: 'published', limit: 100 }),
  });
  const caseStudiesQuery = useQuery({
    queryKey: ['case-studies', 'homepage'],
    queryFn: () => api.getCaseStudies({ status: 'published', limit: 100 }),
  });

  useEffect(() => {
    if (editorQuery.data?.draftContent) setDraft(editorQuery.data.draftContent);
  }, [editorQuery.data?.draftContent]);

  const saveMutation = useMutation({
    mutationFn: (content: HomepageContent) => api.updateHomepage(content),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['homepage-editor'] });
      toast.success('Homepage draft saved.');
      setDraft(data.draftContent);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: () => api.publishHomepage(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-editor'] });
      toast.success('Homepage published.');
      setConfirmPublish(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => api.unpublishHomepage(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-editor'] });
      toast.success('Homepage unpublished.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (editorQuery.isLoading || !draft) {
    return (
      <Layout title="Homepage">
        <LoadingState />
      </Layout>
    );
  }

  if (editorQuery.isError) {
    return (
      <Layout title="Homepage">
        <ErrorState message="Unable to load homepage configuration." />
      </Layout>
    );
  }

  const editor = editorQuery.data!;
  const capabilities = (capabilitiesQuery.data?.items ?? []) as Capability[];
  const products = (productsQuery.data?.items ?? []) as Product[];
  const industries = (industriesQuery.data?.items ?? []) as Industry[];
  const caseStudies = (caseStudiesQuery.data?.items ?? []) as CaseStudy[];

  const updateSection = <K extends SectionKey>(key: K, value: HomepageContent[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = () => {
    if (draft) saveMutation.mutate(draft);
  };

  const handlePreview = async () => {
    if (draft) await saveMutation.mutateAsync(draft);
    window.open(WEBSITE_URL, '_blank', 'noopener,noreferrer');
  };

  const renderSectionEditor = () => {
    if (!activeSection) return null;

    switch (activeSection) {
      case 'hero':
        return (
          <FormSection title="Hero">
            <VisibilityToggle visible={draft.hero.visible} onChange={(visible) => updateSection('hero', { ...draft.hero, visible })} />
            <label className="cms-field"><span className="cms-field__label">Eyebrow</span><input className="cms-input" value={draft.hero.eyebrow} onChange={(e) => updateSection('hero', { ...draft.hero, eyebrow: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Headline line 1</span><input className="cms-input" value={draft.hero.headlineLine1} onChange={(e) => updateSection('hero', { ...draft.hero, headlineLine1: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Headline line 2</span><input className="cms-input" value={draft.hero.headlineLine2} onChange={(e) => updateSection('hero', { ...draft.hero, headlineLine2: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Supporting text</span><textarea className="cms-input" rows={3} value={draft.hero.supportingText} onChange={(e) => updateSection('hero', { ...draft.hero, supportingText: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Primary CTA label</span><input className="cms-input" value={draft.hero.primaryCtaLabel} onChange={(e) => updateSection('hero', { ...draft.hero, primaryCtaLabel: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Primary CTA URL</span><input className="cms-input" value={draft.hero.primaryCtaUrl} onChange={(e) => updateSection('hero', { ...draft.hero, primaryCtaUrl: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Hero visual</span><MediaPicker value={draft.hero.heroVisualMediaId} onChange={(v) => updateSection('hero', { ...draft.hero, heroVisualMediaId: singleMediaId(v) })} /></label>
            <label className="cms-field"><span className="cms-field__label">Mobile hero visual</span><MediaPicker value={draft.hero.mobileHeroVisualMediaId} onChange={(v) => updateSection('hero', { ...draft.hero, mobileHeroVisualMediaId: singleMediaId(v) })} /></label>
            <p className="cms-field__hint">Upload screenshots here or from CMS → Media. Save draft, then publish the homepage.</p>
          </FormSection>
        );
      case 'whatWeBuild':
        return (
          <FormSection title="What We Build">
            <VisibilityToggle visible={draft.whatWeBuild.visible} onChange={(visible) => updateSection('whatWeBuild', { ...draft.whatWeBuild, visible })} />
            <label className="cms-field"><span className="cms-field__label">Eyebrow</span><input className="cms-input" value={draft.whatWeBuild.eyebrow} onChange={(e) => updateSection('whatWeBuild', { ...draft.whatWeBuild, eyebrow: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Headline</span><textarea className="cms-input" rows={3} value={draft.whatWeBuild.headline} onChange={(e) => updateSection('whatWeBuild', { ...draft.whatWeBuild, headline: e.target.value })} /></label>
            <OrderedPicker
              label="Capabilities"
              ids={draft.whatWeBuild.capabilityIds}
              options={capabilities.map((cap) => ({ id: cap.id, name: cap.name }))}
              max={8}
              onChange={(capabilityIds) => updateSection('whatWeBuild', { ...draft.whatWeBuild, capabilityIds })}
            />
            <label className="cms-field"><span className="cms-field__label">Desktop visual</span><MediaPicker value={draft.whatWeBuild.desktopVisualMediaId} onChange={(v) => updateSection('whatWeBuild', { ...draft.whatWeBuild, desktopVisualMediaId: singleMediaId(v) })} /></label>
            <label className="cms-field"><span className="cms-field__label">Mobile visual</span><MediaPicker value={draft.whatWeBuild.mobileVisualMediaId} onChange={(v) => updateSection('whatWeBuild', { ...draft.whatWeBuild, mobileVisualMediaId: singleMediaId(v) })} /></label>
          </FormSection>
        );
      case 'products':
        return (
          <FormSection title="Featured Products">
            <VisibilityToggle visible={draft.products.visible} onChange={(visible) => updateSection('products', { ...draft.products, visible })} />
            <label className="cms-field"><span className="cms-field__label">Eyebrow</span><input className="cms-input" value={draft.products.eyebrow} onChange={(e) => updateSection('products', { ...draft.products, eyebrow: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Headline</span><input className="cms-input" value={draft.products.headline} onChange={(e) => updateSection('products', { ...draft.products, headline: e.target.value })} /></label>
            <OrderedPicker
              label="Featured products"
              ids={draft.products.featuredProductIds}
              options={products.map((product) => ({ id: product.id, name: product.name, meta: product.category ?? undefined }))}
              max={4}
              onChange={(featuredProductIds) => updateSection('products', { ...draft.products, featuredProductIds })}
            />
          </FormSection>
        );
      case 'forBusiness':
        return (
          <FormSection title="For Business">
            <VisibilityToggle visible={draft.forBusiness.visible} onChange={(visible) => updateSection('forBusiness', { ...draft.forBusiness, visible })} />
            <label className="cms-field"><span className="cms-field__label">Eyebrow</span><input className="cms-input" value={draft.forBusiness.eyebrow} onChange={(e) => updateSection('forBusiness', { ...draft.forBusiness, eyebrow: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Headline</span><input className="cms-input" value={draft.forBusiness.headline} onChange={(e) => updateSection('forBusiness', { ...draft.forBusiness, headline: e.target.value })} /></label>
            <OrderedPicker
              label="Featured industries"
              ids={draft.forBusiness.featuredIndustryIds}
              options={industries.map((industry) => ({ id: industry.id, name: industry.name }))}
              max={6}
              onChange={(featuredIndustryIds) => updateSection('forBusiness', { ...draft.forBusiness, featuredIndustryIds })}
            />
          </FormSection>
        );
      case 'work':
        return (
          <FormSection title="Featured Work">
            <VisibilityToggle visible={draft.work.visible} onChange={(visible) => updateSection('work', { ...draft.work, visible })} />
            <label className="cms-field"><span className="cms-field__label">Eyebrow</span><input className="cms-input" value={draft.work.eyebrow} onChange={(e) => updateSection('work', { ...draft.work, eyebrow: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Headline</span><textarea className="cms-input" rows={3} value={draft.work.headline} onChange={(e) => updateSection('work', { ...draft.work, headline: e.target.value })} /></label>
            <OrderedPicker
              label="Featured case studies"
              ids={draft.work.featuredCaseStudyIds}
              options={caseStudies.map((cs) => ({ id: cs.id, name: cs.title, meta: cs.client ?? undefined }))}
              max={4}
              onChange={(featuredCaseStudyIds) => updateSection('work', { ...draft.work, featuredCaseStudyIds })}
            />
          </FormSection>
        );
      case 'about':
        return (
          <FormSection title="About">
            <VisibilityToggle visible={draft.about.visible} onChange={(visible) => updateSection('about', { ...draft.about, visible })} />
            <label className="cms-field"><span className="cms-field__label">Eyebrow</span><input className="cms-input" value={draft.about.eyebrow} onChange={(e) => updateSection('about', { ...draft.about, eyebrow: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Headline lines</span><textarea className="cms-input" rows={4} value={arrayToLines(draft.about.headlineLines)} onChange={(e) => updateSection('about', { ...draft.about, headlineLines: linesToArray(e.target.value) })} /></label>
            <label className="cms-field"><span className="cms-field__label">Short description</span><textarea className="cms-input" rows={4} value={draft.about.shortDescription} onChange={(e) => updateSection('about', { ...draft.about, shortDescription: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Meta line</span><input className="cms-input" value={draft.about.metaLine} onChange={(e) => updateSection('about', { ...draft.about, metaLine: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Visual</span><MediaPicker value={draft.about.visualMediaId} onChange={(v) => updateSection('about', { ...draft.about, visualMediaId: singleMediaId(v) })} /></label>
            <label className="cms-field"><span className="cms-field__label">Link label</span><input className="cms-input" value={draft.about.linkLabel} onChange={(e) => updateSection('about', { ...draft.about, linkLabel: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Link URL</span><input className="cms-input" value={draft.about.linkUrl} onChange={(e) => updateSection('about', { ...draft.about, linkUrl: e.target.value })} /></label>
          </FormSection>
        );
      case 'contact':
        return (
          <FormSection title="Contact CTA">
            <VisibilityToggle visible={draft.contact.visible} onChange={(visible) => updateSection('contact', { ...draft.contact, visible })} />
            <label className="cms-field"><span className="cms-field__label">Eyebrow</span><input className="cms-input" value={draft.contact.eyebrow} onChange={(e) => updateSection('contact', { ...draft.contact, eyebrow: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Headline</span><input className="cms-input" value={draft.contact.headline} onChange={(e) => updateSection('contact', { ...draft.contact, headline: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Supporting text</span><input className="cms-input" value={draft.contact.supportingText} onChange={(e) => updateSection('contact', { ...draft.contact, supportingText: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Button label</span><input className="cms-input" value={draft.contact.buttonLabel} onChange={(e) => updateSection('contact', { ...draft.contact, buttonLabel: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-field__label">Button URL</span><input className="cms-input" value={draft.contact.buttonUrl} onChange={(e) => updateSection('contact', { ...draft.contact, buttonUrl: e.target.value })} /></label>
          </FormSection>
        );
      default:
        return null;
    }
  };

  return (
    <Layout title="Homepage">
      <div className="cms-editor-actions">
        <StatusBadge status={editor.status} />
        {editor.hasUnpublishedChanges && (
          <span className="cms-badge cms-badge--warning">
            {editor.changedSections.length} unpublished change{editor.changedSections.length === 1 ? '' : 's'}
          </span>
        )}
        <button className="cms-button" onClick={handlePreview} disabled={saveMutation.isPending}>Preview Homepage</button>
        <button className="cms-button cms-button--primary" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save Draft'}
        </button>
        {editor.status === 'published' ? (
          <button className="cms-button" onClick={() => unpublishMutation.mutate()} disabled={unpublishMutation.isPending}>Unpublish</button>
        ) : null}
        <button
          className="cms-button cms-button--primary"
          onClick={() => setConfirmPublish(true)}
          disabled={publishMutation.isPending}
        >
          Publish
        </button>
      </div>

      {!activeSection ? (
        <section className="cms-panel">
          <div className="cms-panel__header">
            <h2>Homepage Sections</h2>
            <p>Fixed section order. Edit content, visibility, and featured relationships.</p>
          </div>
          <div className="cms-section-list">
            {SECTION_META.map((section) => {
              const content = draft[section.key];
              const changed = editor.changedSections.includes(SECTION_CHANGE_LABELS[section.key]);
              return (
                <div key={section.key} className="cms-section-list__item">
                  <div>
                    <strong>{section.number} {section.label}</strong>
                    <div className="cms-section-list__summary">{sectionSummary(section.key, draft)}</div>
                  </div>
                  <div className="cms-table__actions">
                    <span className={`cms-status-badge cms-status-badge--${content.visible ? 'published' : 'draft'}`}>
                      {content.visible ? 'Visible' : 'Hidden'}
                    </span>
                    {changed && <span className="cms-badge cms-badge--warning">Draft changes</span>}
                    <button className="cms-button cms-button--sm" onClick={() => setActiveSection(section.key)}>Edit</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <>
          <div className="cms-editor-actions">
            <button className="cms-button" onClick={() => setActiveSection(null)}>← Back to sections</button>
          </div>
          {renderSectionEditor()}
          <div className="cms-editor-actions">
            <button className="cms-button cms-button--primary" onClick={handleSave} disabled={saveMutation.isPending}>Save Section</button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmPublish}
        title="Publish Homepage"
        message={
          <>
            <p>Publish the following changes to the public homepage?</p>
            {editor.changedSections.length > 0 ? (
              <ul>
                {editor.changedSections.map((section) => (
                  <li key={section}>{section}</li>
                ))}
              </ul>
            ) : (
              <p>No draft changes detected. Current draft will be published.</p>
            )}
          </>
        }
        confirmLabel="Publish"
        onConfirm={() => publishMutation.mutate()}
        onCancel={() => setConfirmPublish(false)}
      />
    </Layout>
  );
}
