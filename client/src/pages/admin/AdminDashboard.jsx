import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/toast.jsx';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    api('/admin/stats').then((d) => setStats(d)).catch(() => {});
    loadAnnouncements();
  }, []);

  function loadAnnouncements() {
    api('/admin/announcements').then((d) => setAnnouncements(d.announcements)).catch(() => {});
  }

  async function postAnnouncement(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setPosting(true);
    try {
      await api('/admin/announcements', { method: 'POST', body: { title, body } });
      setTitle('');
      setBody('');
      toast('Announcement published');
      loadAnnouncements();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setPosting(false);
    }
  }

  async function deleteAnnouncement(a) {
    if (!confirm('Delete this announcement?')) return;
    await api(`/admin/announcements/${a.id}`, { method: 'DELETE' });
    toast('Announcement deleted');
    loadAnnouncements();
  }

  const cards = stats
    ? [
        { label: 'Students', val: stats.students, to: '/admin/students' },
        { label: 'Courses', val: stats.courses, to: '/admin/courses' },
        { label: 'Lessons', val: stats.lessons, to: '/admin/courses' },
        { label: 'Enrollments', val: stats.enrollments, to: '/admin/students' },
        { label: 'Lessons completed', val: stats.completions, to: null },
      ]
    : [];

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
        <Link to="/admin/courses/new" className="btn btn-primary">+ New course</Link>
      </div>

      <div className="stat-grid">
        {cards.map((c) =>
          c.to ? (
            <Link key={c.label} to={c.to} className="card stat-card" style={{ display: 'block' }}>
              <div className="val">{c.val}</div>
              <div className="label">{c.label}</div>
            </Link>
          ) : (
            <div key={c.label} className="card stat-card">
              <div className="val">{c.val}</div>
              <div className="label">{c.label}</div>
            </div>
          )
        )}
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 32 }}>
        <h3 style={{ fontSize: 16 }}>Quick start</h3>
        <ul style={{ paddingLeft: 20, color: 'var(--text-muted)', lineHeight: 2 }}>
          <li>Create a <Link to="/admin/courses/new" style={{ color: 'var(--primary)' }}>new course</Link>, then add modules and lessons.</li>
          <li>Upload a <strong>video</strong> (MP4/WebM) and optional <strong>notes</strong> (PDF/DOC/etc.) for each lesson.</li>
          <li>Add a <strong>quiz</strong> to any lesson from the course editor (the “Quiz” button).</li>
          <li>Manage enrolled students under <Link to="/admin/students" style={{ color: 'var(--primary)' }}>Students</Link>.</li>
        </ul>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>📣 Announcements</h3>
        <form onSubmit={postAnnouncement} style={{ marginBottom: 20 }}>
          <div className="field">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
          </div>
          <div className="field">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message to all students…" />
          </div>
          <button className="btn btn-primary" disabled={posting || !title.trim()}>
            {posting ? 'Publishing…' : 'Publish announcement'}
          </button>
        </form>

        {announcements.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No announcements yet.</p>
        ) : (
          announcements.map((a) => (
            <div key={a.id} style={{ borderTop: '1px solid var(--border)', padding: '12px 0', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {a.author} · {new Date(a.created_at + 'Z').toLocaleString()}
                </div>
                {a.body && <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', marginTop: 4 }}>{a.body}</div>}
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => deleteAnnouncement(a)}>Delete</button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
