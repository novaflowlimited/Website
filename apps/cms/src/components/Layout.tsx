import { NavLink, useNavigate } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import { useSession } from '../auth/SessionProvider';
import { useToast } from './ToastProvider';

interface NavGroup {
  label: string;
  items: Array<{ label: string; path: string; adminOnly?: boolean }>;
}

const navGroups: NavGroup[] = [
  {
    label: 'NOVAFLOW',
    items: [{ label: 'Dashboard', path: '/dashboard' }],
  },
  {
    label: 'CONTENT',
    items: [
      { label: 'Products', path: '/products' },
      { label: 'Industries', path: '/industries' },
      { label: 'Capabilities', path: '/capabilities' },
      { label: 'Case Studies', path: '/case-studies' },
      { label: 'Insights', path: '/insights' },
      { label: 'Categories', path: '/insights/categories' },
      { label: 'Authors', path: '/insights/authors' },
      { label: 'Media', path: '/media' },
    ],
  },
  {
    label: 'SITE',
    items: [
      { label: 'Homepage', path: '/homepage' },
      { label: 'Navigation', path: '/navigation', adminOnly: true },
      { label: 'Site Settings', path: '/site-settings', adminOnly: true },
      { label: 'SEO', path: '/seo' },
    ],
  },
  {
    label: 'LEADS',
    items: [{ label: 'Contact Enquiries', path: '/contact-enquiries', adminOnly: true }],
  },
];

export function Layout({ title, children }: { title: string; children: ReactNode }) {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully.');
    navigate('/login');
  };

  return (
    <div className="cms-shell">
      <button
        className="cms-sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        ☰
      </button>
      <aside className={`cms-sidebar ${sidebarOpen ? 'cms-sidebar--open' : ''}`}>
        <div className="cms-brand">Novaflow CMS</div>
        <nav className="cms-nav" aria-label="CMS navigation">
          {navGroups.map((group) => {
            const items = group.items.filter((item) => !item.adminOnly || user?.role === 'admin');
            if (items.length === 0) return null;
            return (
              <div key={group.label} className="cms-nav-group">
                <span className="cms-nav-group__label">{group.label}</span>
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => (isActive ? 'cms-nav-item active' : 'cms-nav-item')}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="cms-sidebar__footer">
          <div className="cms-user-info">
            <span className="cms-user-info__name">{user?.name}</span>
            <span className="cms-user-info__role">{user?.role}</span>
          </div>
          <button className="cms-button cms-button--ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="cms-main">
        <header className="cms-header">
          <h1>{title}</h1>
        </header>
        {children}
      </main>
    </div>
  );
}
