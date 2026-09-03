import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider';
import { useToast } from '../components/ToastProvider';

export function Login() {
  const { login } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cms-login">
      <div className="cms-login__card">
        <h1 className="cms-login__title">Novaflow CMS</h1>
        <p className="cms-login__subtitle">Sign in to manage your content</p>
        <form onSubmit={handleSubmit} className="cms-login__form">
          <label className="cms-field">
            <span className="cms-field__label">Email</span>
            <input
              type="email"
              className="cms-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="cms-field">
            <span className="cms-field__label">Password</span>
            <input
              type="password"
              className="cms-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="cms-button cms-button--primary cms-button--block" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        {import.meta.env.DEV && (
          <div className="cms-login__hint">
            <p>Local development only — use seeded CMS users.</p>
          </div>
        )}
      </div>
    </div>
  );
}
