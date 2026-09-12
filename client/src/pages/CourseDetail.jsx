import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, thumbUrl } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../components/toast.jsx';

function fmtDuration(sec) {
  if (!sec) return '';
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    api(`/courses/${id}`)
      .then((d) => setCourse(d.course))
      .catch(() => setCourse(null))
      .finally(() => setLoading(false));
  }, [id, user]);

  async function enroll() {
    if (!user) return navigate('/login');
    setBusy(true);
    try {
      await api(`/student/courses/${id}/enroll`, { method: 'POST' });
      toast('You are now enrolled!');
      const d = await api(`/courses/${id}`);
      setCourse(d.course);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="page-loading"><div className="spinner" /></div>;
  }
  if (!course) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="big">🔍</div>
          <p>Course not found.</p>
          <Link to="/" className="btn btn-primary">Back to courses</Link>
        </div>
      </div>
    );
  }

  const thumb = thumbUrl(course.thumbnail);

  return (
    <>
      <section className="course-hero">
        <div className="course-hero-inner">
          <div>
            <div className="breadcrumbs">
              <Link to="/">Courses</Link> / {course.category}
            </div>
            <h1>{course.title}</h1>
            <div className="byline">Instructor: {course.instructor || 'LearnHub'}</div>
            <div className="hero-badges">
              <span className="badge primary">{course.level}</span>
              <span className="badge">{course.category}</span>
              <span className="badge">{course.total_lessons} lessons</span>
            </div>
            <p style={{ color: '#dbeafe', maxWidth: 560 }}>{course.description}</p>
          </div>
          <div className="enroll-panel">
            {thumb ? <img src={thumb} alt={course.title} style={{ borderRadius: 8, marginBottom: 16 }} /> : null}
            {user?.role === 'admin' ? (
              <Link to={`/admin/courses/${course.id}/edit`} className="btn btn-outline btn-block">
                Edit in admin panel
              </Link>
            ) : course.enrolled ? (
              <>
                <div className="alert alert-success" style={{ marginBottom: 12 }}>
                  ✅ You're enrolled
                </div>
                <div className="p-row" style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  {course.progress}% complete
                </div>
                <div className="progress" style={{ marginBottom: 16 }}>
                  <span style={{ width: `${course.progress}%` }} />
                </div>
                <Link to={`/learn/${course.id}`} className="btn btn-primary btn-block">
                  Continue learning
                </Link>
              </>
            ) : (
              <>
                <div className="price">{course.is_free ? 'Free' : 'Paid course'}</div>
                <button className="btn btn-primary btn-lg btn-block" onClick={enroll} disabled={busy}>
                  {busy ? 'Enrolling…' : 'Enroll now'}
                </button>
                {!user && <p className="hint" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>You'll be asked to log in or sign up.</p>}
              </>
            )}
          </div>
        </div>
      </section>

      <section className="curriculum">
        <div className="curriculum-main">
          <h2>Course curriculum</h2>
          {course.modules?.length === 0 && (
            <div className="empty-state" style={{ border: '1px dashed var(--border)', borderRadius: 12 }}>
              <p>No modules added yet.</p>
            </div>
          )}
          {course.modules?.map((m, mi) => (
            <div className="module" key={m.id}>
              <div className="module-head">
                <span>Module {mi + 1}: {m.title}</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 13 }}>
                  {m.lessons.length} lessons
                </span>
              </div>
              {m.lessons.map((l, li) => (
                <div className="lesson-row" key={l.id}>
                  <span className="idx">{mi + 1}.{li + 1}</span>
                  <span style={{ fontSize: 15 }}>🎬</span>
                  <span className="l-title">{l.title}</span>
                  <span className="l-meta">{l.notes_path ? '📄 notes' : ''} {fmtDuration(l.duration_sec)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div>
          <div className="card side-card">
            <h3>What you'll get</h3>
            <ul>
              <li><b>Videos</b> <span>{course.total_lessons} lessons</span></li>
              <li><b>Notes</b> <span>Downloadable</span></li>
              <li><b>Progress</b> <span>Tracked</span></li>
              <li><b>Level</b> <span>{course.level}</span></li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
