import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container">
      <div className="empty-state" style={{ paddingTop: 100, paddingBottom: 100 }}>
        <div className="big" style={{ fontSize: 72 }}>404</div>
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>Page not found</h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 24px' }}>
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/" className="btn btn-primary">Browse courses</Link>
          <Link to="/dashboard" className="btn btn-outline">My Learning</Link>
        </div>
      </div>
    </div>
  );
}
