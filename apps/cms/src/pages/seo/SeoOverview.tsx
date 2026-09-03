import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Layout } from '../../components/Layout';
import { LoadingState, ErrorState, EmptyState } from '../../components/EmptyState';

export function SeoOverview() {
  const query = useQuery({ queryKey: ['seo'], queryFn: () => api.getSeoEntries() });

  return (
    <Layout title="SEO Management">
      <section className="cms-panel">
        <div className="cms-panel__header"><h2>SEO Entries</h2></div>
        {query.isLoading ? <LoadingState /> :
         query.isError ? <ErrorState message="Unable to load SEO entries." /> :
         !query.data || query.data.items.length === 0 ? <EmptyState title="No SEO entries yet." /> :
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead><tr><th>Entity Type</th><th>Title</th><th>Description</th><th>Updated</th></tr></thead>
              <tbody>
                {query.data.items.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.entityType}</td>
                    <td>{entry.title ?? '—'}</td>
                    <td>{entry.description ? `${entry.description.slice(0, 60)}…` : '—'}</td>
                    <td>{new Date(entry.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </section>
      <section className="cms-panel">
        <div className="cms-panel__header"><h2>Character Guidance</h2></div>
        <ul className="cms-list">
          <li><strong>SEO Title</strong><span>Recommended: 50–60 characters</span></li>
          <li><strong>SEO Description</strong><span>Recommended: 150–160 characters</span></li>
          <li><strong>OG Image</strong><span>Recommended: 1200×630px</span></li>
        </ul>
      </section>
    </Layout>
  );
}
