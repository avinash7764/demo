import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <form className="card form-card" onSubmit={submit}>
        <h2>Welcome back</h2>
        <p className="sub">Log in to continue your learning.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14, color: 'var(--text-muted)' }}>
          New here? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create an account</Link>
        </p>
      </form>
    </div>
  );
}
