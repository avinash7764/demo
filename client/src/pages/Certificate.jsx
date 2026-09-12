import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

export default function Certificate() {
  const { id } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/courses/${id}`)
      .then((d) => setCourse(d.course))
      .catch(() => setCourse(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  if (!course || !course.enrolled || course.progress < 100) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="big">🔒</div>
          <p>Complete this course to unlock your certificate.</p>
          <Link to={`/learn/${id}`} className="btn btn-primary">Go to course</Link>
        </div>
      </div>
    );
  }

  const completedDate = course.completed_at
    ? new Date(course.completed_at + 'Z').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="container">
      <div style={{ margin: '32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Link to={`/courses/${course.id}`} className="btn btn-ghost">← Back to course</Link>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print / Save as PDF</button>
      </div>

      <div className="certificate">
        <div className="c-seal">Certified</div>
        <div className="c-logo">🎓 LearnHub</div>
        <div className="c-title">Certificate of Completion</div>
        <div className="c-sub">This certifies that</div>
        <div className="c-name">{user?.name}</div>
        <div className="c-body">has successfully completed the course</div>
        <div className="c-course">{course.title}</div>
        <div className="c-body" style={{ marginTop: 4 }}>taught by {course.instructor || 'LearnHub'}</div>
        <div className="c-foot">
          <div className="sig">
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{new Date(completedDate + ' 00:00').toLocaleDateString()}</div>
            Date of completion
          </div>
          <div className="sig" style={{ textAlign: 'center', color: 'var(--text)', fontFamily: 'Georgia, serif', fontSize: 20, fontStyle: 'italic' }}>
            LearnHub Academy
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'normal' }}>Director of Learning</div>
          </div>
          <div className="sig" style={{ textAlign: 'right' }}>
            ✓ Verified
            <div>LearnHub ID: LH-{String(course.id).padStart(4, '0')}-{String(user?.id || 0).padStart(4, '0')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
