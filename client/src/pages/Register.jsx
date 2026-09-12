import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <form className="card form-card" onSubmit={submit}>
        <h2>Create your account</h2>
        <p className="sub">Start learning today — it takes a minute.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="field">
          <label>Full name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav Sharma" />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        </div>
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? 'Creating account…' : 'Sign up'}
        </button>
        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14, color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Log in</Link>
        </p>
      </form>
    </div>
  );
}
