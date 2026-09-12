import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <header className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="brand">
            <span className="logo">🎓</span> LearnHub
          </Link>
          <nav className="nav-links">
            <NavLink to="/" end>Courses</NavLink>
            {user && <NavLink to="/dashboard">My Learning</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          </nav>
          <div className="nav-right">
            {user ? (
              <>
                <Link to="/dashboard" className="avatar" title={user.name}>
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </Link>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="brand">🎓 LearnHub</div>
          <div>© {new Date().getFullYear()} LearnHub. Learn, build, grow.</div>
        </div>
      </footer>
    </>
  );
}
