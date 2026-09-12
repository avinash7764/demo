import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api('/admin/stats').then((d) => setStats(d)).catch(() => {});
  }, []);

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

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16 }}>Quick start</h3>
        <ul style={{ paddingLeft: 20, color: 'var(--text-muted)', lineHeight: 2 }}>
          <li>Create a <Link to="/admin/courses/new" style={{ color: 'var(--primary)' }}>new course</Link>, then add modules and lessons.</li>
          <li>Upload a <strong>video</strong> (MP4/WebM) and optional <strong>notes</strong> (PDF/DOC/etc.) for each lesson.</li>
          <li>Manage enrolled students under <Link to="/admin/students" style={{ color: 'var(--primary)' }}>Students</Link>.</li>
        </ul>
      </div>
    </>
  );
}
