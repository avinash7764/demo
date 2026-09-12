import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/admin" className="brand">
          <span className="logo">🎓</span> LearnHub Admin
        </Link>
        <nav>
          <NavLink to="/admin" end>Dashboard</NavLink>
          <NavLink to="/admin/courses">Courses</NavLink>
          <NavLink to="/admin/students">Students</NavLink>
        </nav>
        <div className="side-foot">
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            <div style={{ color: '#fff', fontWeight: 600 }}>{user?.name}</div>
            <div style={{ fontSize: 12 }}>{user?.email}</div>
          </div>
          <Link to="/" className="btn btn-ghost btn-sm" style={{ color: '#cbd5e1' }}>← Back to site</Link>
          <button
            className="btn btn-outline btn-sm"
            style={{ borderColor: '#475569', color: '#e2e8f0', marginLeft: 8 }}
            onClick={() => { logout(); navigate('/login'); }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
