import type { ReactNode } from 'react';

export function EmptyState({ title, action, actionLabel }: { title: string; action?: () => void; actionLabel?: string }) {
  return (
    <div className="cms-empty-state">
      <p className="cms-empty-state__title">{title}</p>
      {action && actionLabel && (
        <button className="cms-button cms-button--primary" onClick={action}>
          {actionLabel} →
        </button>
      )}
    </div>
  );
}

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="cms-loading-state">
      <span className="cms-spinner" />
      <span>{message}</span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="cms-error-state">
      <p>⚠ {message}</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const className = `cms-status-badge cms-status-badge--${status}`;
  const labels: Record<string, string> = {
    new: 'New',
    reviewing: 'Reviewing',
    contacted: 'Contacted',
    qualified: 'Qualified',
    closed: 'Closed',
    in_progress: 'In Progress',
  };
  const label = labels[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={className}>{label}</span>;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="cms-modal-overlay" onClick={onCancel}>
      <div className="cms-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="cms-modal__title">{title}</h2>
        <div className="cms-modal__body">{message}</div>
        <div className="cms-modal__actions">
          <button className="cms-button" onClick={onCancel}>{cancelLabel}</button>
          <button className="cms-button cms-button--danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="cms-form-section">
      <h2 className="cms-form-section__title">{title}</h2>
      <div className="cms-form-section__body">{children}</div>
    </section>
  );
}

export function DataTable<T>({
  columns,
  rows,
  actions,
  emptyMessage,
  onAction,
}: {
  columns: Array<{ key: string; label: string }>;
  rows: T[];
  actions?: Array<{ label: string; action: string }>;
  emptyMessage?: string;
  onAction?: (action: string, row: T) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyMessage ?? 'No entries yet.'} />;
  }
  return (
    <div className="cms-table-wrap">
      <table className="cms-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {actions && actions.length > 0 && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((col) => (
                <td key={col.key}>{String((row as Record<string, unknown>)[col.key] ?? '—')}</td>
              ))}
              {actions && actions.length > 0 && (
                <td className="cms-table__actions">
                  {actions.map((a) => (
                    <button
                      key={a.action}
                      className="cms-button cms-button--sm"
                      onClick={() => onAction?.(a.action, row)}
                    >
                      {a.label}
                    </button>
                  ))}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
