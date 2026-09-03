import { trackContactEvent } from '../lib/analytics';
import { resolveProjectTypeFromContext } from '../lib/contact-context';

const API_URL = (import.meta.env.PUBLIC_API_URL as string | undefined)?.replace(/\/$/, '') || '';

function fieldControl(form: HTMLFormElement, field: string) {
  return form.querySelector<HTMLElement>(`#${field}`);
}

function setFieldInvalid(form: HTMLFormElement, field: string, message: string) {
  const error = form.querySelector<HTMLElement>(`[data-field-error="${field}"]`);
  const control = fieldControl(form, field);
  if (error) {
    error.id = `${field}-error`;
    error.textContent = message;
    error.hidden = !message;
  }
  if (control) {
    control.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (message) control.setAttribute('aria-describedby', `${field}-error`);
    else control.removeAttribute('aria-describedby');
  }
}

function clearFieldErrors(form: HTMLFormElement) {
  form.querySelectorAll<HTMLElement>('[data-field-error]').forEach((node) => {
    const field = node.getAttribute('data-field-error');
    node.textContent = '';
    node.hidden = true;
    if (!field) return;
    const control = fieldControl(form, field);
    control?.setAttribute('aria-invalid', 'false');
    control?.removeAttribute('aria-describedby');
  });
}

function showSuccess(root: HTMLElement) {
  const formPanel = root.querySelector<HTMLElement>('[data-contact-form-panel]');
  const successPanel = root.querySelector<HTMLElement>('[data-contact-success]');
  if (formPanel) formPanel.hidden = true;
  if (successPanel) {
    successPanel.hidden = false;
    successPanel.focus();
  }
}

function showForm(root: HTMLElement) {
  const formPanel = root.querySelector<HTMLElement>('[data-contact-form-panel]');
  const successPanel = root.querySelector<HTMLElement>('[data-contact-success]');
  if (successPanel) successPanel.hidden = true;
  if (formPanel) formPanel.hidden = false;
}

function applyProjectContext(form: HTMLFormElement, root: HTMLElement) {
  const params = new URLSearchParams(window.location.search);
  const project = params.get('project')?.trim() || '';
  const projectType = resolveProjectTypeFromContext(project);
  const source = project ? `contact?project=${project}` : 'contact';

  form.dataset.source = source;
  form.dataset.projectContext = project;
  form.dataset.initialProjectType = projectType;

  const sourceInput = form.querySelector<HTMLInputElement>('[data-contact-source]');
  if (sourceInput) sourceInput.value = source;

  const projectSelect = form.querySelector<HTMLSelectElement>('#projectType');
  if (projectSelect && projectType) {
    projectSelect.value = projectType;
    trackContactEvent('project_context_selected', { project, projectType });
  }

  const context = root.querySelector<HTMLElement>('[data-contact-context]');
  if (context) {
    context.replaceChildren();
    if (projectType || project) {
      context.hidden = false;
      context.append('Context: ');
      const strong = document.createElement('strong');
      strong.textContent = projectType || 'Custom system';
      context.append(strong);
      if (project) context.append(` · ${project}`);
    } else {
      context.hidden = true;
    }
  }
}

export function initContactPage() {
  const root = document.querySelector<HTMLElement>('[data-contact-page]');
  if (!root || root.dataset.contactReady === 'true') return;
  root.dataset.contactReady = 'true';

  const form = root.querySelector<HTMLFormElement>('#contact-form');
  const status = root.querySelector<HTMLParagraphElement>('#contact-form-status');
  const submitButton = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
  const anotherButton = root.querySelector<HTMLButtonElement>('[data-contact-another]');
  if (!form || !status || !submitButton) return;

  applyProjectContext(form, root);

  trackContactEvent('contact_page_view', {
    project: form.dataset.projectContext || null,
    source: form.dataset.source || 'contact',
  });

  let started = false;
  let submitting = false;

  const markStart = () => {
    if (started) return;
    started = true;
    trackContactEvent('contact_form_start', {
      project: form.dataset.projectContext || null,
    });
  };

  form.addEventListener('focusin', markStart);
  form.addEventListener('input', markStart);

  const projectSelect = form.querySelector<HTMLSelectElement>('#projectType');
  projectSelect?.addEventListener('change', () => {
    trackContactEvent('project_context_selected', { projectType: projectSelect.value });
  });

  anotherButton?.addEventListener('click', () => {
    showForm(root);
    form.reset();
    applyProjectContext(form, root);
    status.textContent = '';
    status.dataset.state = '';
    form.removeAttribute('aria-busy');
    clearFieldErrors(form);
    form.querySelector<HTMLInputElement>('#name')?.focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;

    clearFieldErrors(form);
    status.textContent = '';
    status.dataset.state = '';

    const formData = new FormData(form);
    const honeypot = String(formData.get('website') ?? '').trim();
    if (honeypot) {
      showSuccess(root);
      return;
    }

    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      company: String(formData.get('company') ?? '').trim(),
      projectType: String(formData.get('projectType') ?? '').trim(),
      message: String(formData.get('message') ?? '').trim(),
      budgetRange: String(formData.get('budgetRange') ?? '').trim(),
      timeline: String(formData.get('timeline') ?? '').trim(),
      source: String(formData.get('source') ?? form.dataset.source ?? 'contact').trim(),
      website: '',
    };

    let valid = true;
    let firstInvalid: HTMLElement | null = null;

    if (payload.name.length < 2) {
      setFieldInvalid(form, 'name', 'Enter your name.');
      firstInvalid ??= fieldControl(form, 'name');
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      setFieldInvalid(form, 'email', 'Enter a valid email address.');
      firstInvalid ??= fieldControl(form, 'email');
      valid = false;
    }
    if (payload.message.length < 12) {
      setFieldInvalid(form, 'message', 'Tell us a bit more about what you need the system to do.');
      firstInvalid ??= fieldControl(form, 'message');
      valid = false;
    }

    if (!valid) {
      status.dataset.state = 'error';
      status.textContent = 'Please check the highlighted fields.';
      firstInvalid?.focus();
      trackContactEvent('contact_form_error', { reason: 'validation' });
      return;
    }

    if (!API_URL) {
      status.dataset.state = 'error';
      status.textContent = 'Contact form is temporarily unavailable. Please try again later.';
      trackContactEvent('contact_form_error', { reason: 'missing_api' });
      return;
    }

    submitting = true;
    form.setAttribute('aria-busy', 'true');
    submitButton.disabled = true;
    submitButton.textContent = 'Sending…';
    status.dataset.state = 'pending';
    status.textContent = 'Sending your enquiry…';
    trackContactEvent('contact_form_submit', {
      projectType: payload.projectType || null,
      source: payload.source,
    });

    try {
      const response = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean };

      if (response.status === 429) {
        throw new Error('Too many enquiries. Please try again shortly.');
      }

      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.');
      }

      trackContactEvent('contact_form_success', {
        projectType: payload.projectType || null,
        source: payload.source,
      });
      form.reset();
      applyProjectContext(form, root);
      showSuccess(root);
      status.dataset.state = 'success';
      status.textContent = '';
    } catch (error) {
      const message =
        error instanceof TypeError
          ? 'Unable to reach Novaflow right now. Please try again.'
          : error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.';
      status.dataset.state = 'error';
      status.textContent = message;
      trackContactEvent('contact_form_error', { reason: 'request' });
    } finally {
      submitting = false;
      form.removeAttribute('aria-busy');
      submitButton.disabled = false;
      submitButton.textContent = 'Send enquiry';
    }
  });
}

initContactPage();
document.addEventListener('astro:page-load', initContactPage);
