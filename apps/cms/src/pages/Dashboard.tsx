import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Layout } from '../components/Layout';
import { LoadingState, ErrorState } from '../components/EmptyState';

export function Dashboard() {
  const statsQuery = useQuery({ queryKey: ['dashboard-stats'], queryFn: () => api.getStats() });
  const activityQuery = useQuery({ queryKey: ['recent-activity'], queryFn: () => api.getRecentActivity(8) });

  if (statsQuery.isLoading) return <Layout title="Dashboard"><LoadingState /></Layout>;
  if (statsQuery.isError) return <Layout title="Dashboard"><ErrorState message="Unable to load dashboard data." /></Layout>;

  const stats = statsQuery.data!;

  const statCards = [
    { label: 'Products', value: stats.products, path: '/products', tone: 'accent' },
    { label: 'Industries', value: stats.industries, path: '/industries' },
    { label: 'Case Studies', value: stats.caseStudies, path: '/case-studies' },
    { label: 'Insights', value: stats.articles ?? 0, path: '/insights' },
    { label: 'Capabilities', value: stats.capabilities, path: '/capabilities' },
    { label: 'Media', value: stats.media, path: '/media' },
    { label: 'Drafts', value: stats.drafts, tone: 'muted' },
    { label: 'Published', value: stats.published },
    { label: 'New Enquiries', value: stats.newEnquiries, path: '/contact-enquiries' },
  ];

  return (
    <Layout title="Dashboard">
      <div className="cms-grid cms-grid--stats">
        {statCards.map((card) => (
          <Link key={card.label} to={card.path ?? '#'} className={`cms-stat-card cms-stat-card--${card.tone ?? 'default'} ${card.path ? 'cms-stat-card--link' : ''}`}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </Link>
        ))}
      </div>

      <section className="cms-panel">
        <div className="cms-panel__header">
          <h2>Recent Activity</h2>
        </div>
        {activityQuery.isLoading ? (
          <LoadingState />
        ) : activityQuery.isError ? (
          <ErrorState message="Unable to load activity." />
        ) : activityQuery.data?.items.length === 0 ? (
          <p className="cms-muted-text">No recent activity.</p>
        ) : (
          <ul className="cms-list">
            {activityQuery.data?.items.map((entry) => (
              <li key={entry.id}>
                <span>
                  <strong>{entry.entityName ?? entry.entityType}</strong>
                  <span className="cms-muted-text"> — {entry.action}</span>
                </span>
                <span className="cms-muted-text">
                  {entry.actorName ?? 'System'} · {new Date(entry.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Layout>
  );
}
