import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Layout } from '../../components/Layout';
import { LoadingState, ErrorState, EmptyState, StatusBadge } from '../../components/EmptyState';
import { useToast } from '../../components/ToastProvider';
import type { Lead, LeadStatus } from '../../types';

const statusActions: Array<{ status: LeadStatus; label: string }> = [
  { status: 'reviewing', label: 'Reviewing' },
  { status: 'contacted', label: 'Contacted' },
  { status: 'qualified', label: 'Qualified' },
  { status: 'closed', label: 'Closed' },
  { status: 'new', label: 'Mark New' },
];

export function ContactEnquiries() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = useQuery({
    queryKey: ['leads', statusFilter, search],
    queryFn: () => api.getLeads({ status: statusFilter, search: search || undefined, limit: 100 }),
  });

  useEffect(() => {
    setNotes(selectedLead?.internalNotes ?? '');
  }, [selectedLead?.id, selectedLead?.internalNotes]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateLeadStatus(id, status),
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLead(lead);
      toast.success('Status updated.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const notesMutation = useMutation({
    mutationFn: ({ id, internalNotes }: { id: string; internalNotes: string }) =>
      api.updateLead(id, { internalNotes: internalNotes || null }),
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLead(lead);
      toast.success('Notes saved.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Layout title="Contact Enquiries">
      <div className="cms-toolbar">
        <input
          className="cms-input cms-toolbar__search"
          placeholder="Search name, email, company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="cms-input cms-toolbar__filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="reviewing">Reviewing</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="closed">Closed</option>
          <option value="in_progress">In Progress (legacy)</option>
        </select>
      </div>

      <section className="cms-panel">
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message="Unable to load enquiries." />
        ) : !query.data || query.data.items.length === 0 ? (
          <EmptyState title="No enquiries yet." />
        ) : (
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Project</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <button type="button" className="cms-link-button" onClick={() => setSelectedLead(lead)}>
                        {lead.name}
                      </button>
                      <div className="cms-muted">{lead.email}</div>
                    </td>
                    <td>{lead.company ?? '—'}</td>
                    <td>{lead.projectType ?? '—'}</td>
                    <td>{lead.source ?? '—'}</td>
                    <td>
                      <StatusBadge status={lead.status} />
                    </td>
                    <td>{new Date(lead.createdAt).toLocaleString()}</td>
                    <td className="cms-table__actions">
                      <button className="cms-button cms-button--sm" onClick={() => setSelectedLead(lead)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedLead && (
        <div className="cms-modal-overlay" onClick={() => setSelectedLead(null)}>
          <div className="cms-modal cms-modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="cms-modal__title">Enquiry Details</h2>
            <div className="cms-enquiry-detail">
              <div className="cms-enquiry-detail__row">
                <span>Name</span>
                <strong>{selectedLead.name}</strong>
              </div>
              <div className="cms-enquiry-detail__row">
                <span>Company</span>
                <strong>{selectedLead.company ?? '—'}</strong>
              </div>
              <div className="cms-enquiry-detail__row">
                <span>Email</span>
                <strong>
                  <a href={`mailto:${selectedLead.email}`}>{selectedLead.email}</a>
                </strong>
              </div>
              {selectedLead.phone && (
                <div className="cms-enquiry-detail__row">
                  <span>Phone</span>
                  <strong>{selectedLead.phone}</strong>
                </div>
              )}
              <div className="cms-enquiry-detail__row">
                <span>Project Type</span>
                <strong>{selectedLead.projectType ?? '—'}</strong>
              </div>
              <div className="cms-enquiry-detail__row">
                <span>Budget</span>
                <strong>{selectedLead.budgetRange ?? '—'}</strong>
              </div>
              <div className="cms-enquiry-detail__row">
                <span>Timeline</span>
                <strong>{selectedLead.timeline ?? '—'}</strong>
              </div>
              <div className="cms-enquiry-detail__row">
                <span>Source</span>
                <strong>{selectedLead.source ?? '—'}</strong>
              </div>
              <div className="cms-enquiry-detail__row">
                <span>Created</span>
                <strong>{new Date(selectedLead.createdAt).toLocaleString()}</strong>
              </div>
              <div className="cms-enquiry-detail__row">
                <span>Status</span>
                <StatusBadge status={selectedLead.status} />
              </div>
              <div className="cms-enquiry-detail__message">
                <span>Project description</span>
                <p>{selectedLead.message}</p>
              </div>
              <label className="cms-field">
                <span className="cms-field__label">Internal notes</span>
                <textarea
                  className="cms-input"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Private notes for the team…"
                />
              </label>
            </div>
            <div className="cms-modal__actions">
              <button
                className="cms-button cms-button--primary"
                onClick={() => notesMutation.mutate({ id: selectedLead.id, internalNotes: notes })}
                disabled={notesMutation.isPending}
              >
                {notesMutation.isPending ? 'Saving…' : 'Save notes'}
              </button>
              {statusActions.map((action) => (
                <button
                  key={action.status}
                  className="cms-button"
                  disabled={statusMutation.isPending || selectedLead.status === action.status}
                  onClick={() => statusMutation.mutate({ id: selectedLead.id, status: action.status })}
                >
                  {action.label}
                </button>
              ))}
              <button className="cms-button cms-button--ghost" onClick={() => setSelectedLead(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
