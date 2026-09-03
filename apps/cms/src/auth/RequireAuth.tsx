import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSession } from './SessionProvider';
import type { UserRole } from '../types';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();

  if (loading) {
    return <div className="cms-loading-screen">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const { user, loading } = useSession();

  if (loading) {
    return <div className="cms-loading-screen">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'admin' && user.role !== 'admin') {
    return (
      <div className="cms-empty-state">
        <p>You don't have permission to access this section.</p>
      </div>
    );
  }

  return <>{children}</>;
}
