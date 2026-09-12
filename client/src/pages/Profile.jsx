import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, thumbUrl } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../components/toast.jsx';

export default function Profile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    api('/student/profile').then((d) => {
      setStats(d.stats);
      setName(d.user.name);
      setAvatar(d.user.avatar);
    }).catch(() => {});
    api('/student/my-courses').then((d) => setCourses(d.courses)).catch(() => {});
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      if (avatarFile) fd.append('avatar', avatarFile);
      const d = await api('/student/profile', { method: 'PUT', formData: fd });
      setAvatar(d.user.avatar);
      toast('Profile updated');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const completedCourses = courses.filter((c) => c.progress >= 100);
  const avatarUrl = avatar ? thumbUrl(avatar) : null;

  return (
    <div className="container">
      <div className="profile-head">
        {avatarUrl ? (
          <img className="profile-avatar" src={avatarUrl} alt={user?.name} />
        ) : (
          <div className="profile-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
        )}
        <div>
          <h1>{user?.name}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 32 }}>
        <div className="card stat-card"><div className="val">{stats?.enrolled ?? 0}</div><div className="label">Courses enrolled</div></div>
        <div className="card stat-card"><div className="val">{stats?.completed ?? 0}</div><div className="label">Courses completed</div></div>
        <div className="card stat-card"><div className="val">{stats?.lessonsDone ?? 0}</div><div className="label">Lessons completed</div></div>
        <div className="card stat-card">
          <div className="val">{stats?.minutesWatched != null ? (stats.minutesWatched >= 60 ? `${Math.floor(stats.minutesWatched / 60)}h ${stats.minutesWatched % 60}m` : `${stats.minutesWatched}m`) : '0m'}</div>
          <div className="label">Minutes watched</div>
        </div>
      </div>

      <div className="profile-grid">
        <form className="card" style={{ padding: 24 }} onSubmit={save}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Edit profile</h3>
          <div className="field">
            <label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Profile picture</label>
            <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0])} />
            {avatar && <div className="hint">Current avatar will be replaced on save.</div>}
          </div>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </form>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Certificates ({completedCourses.length})</h3>
          {completedCourses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Complete a course to earn a certificate of completion.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {completedCourses.map((c) => (
                <li key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, flex: 1 }}>🏅 {c.title}</span>
                  <Link to={`/certificate/${c.id}`} className="btn btn-outline btn-sm">View</Link>
                </li>
              ))}
            </ul>
          )}
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />
          <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
