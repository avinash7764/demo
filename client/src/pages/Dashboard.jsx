import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import CourseCard from '../components/CourseCard.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/student/my-courses')
      .then((d) => setCourses(d.courses))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalLessons = courses.reduce((n, c) => n + (c.lesson_count || 0), 0);
  const completed = courses.reduce((n, c) => n + Math.round(((c.progress || 0) / 100) * (c.lesson_count || 0)), 0);
  const inProgress = courses.filter((c) => c.progress > 0 && c.progress < 100);
  const doneCourses = courses.filter((c) => c.progress >= 100);

  return (
    <div className="container">
      <div className="dash-head">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>My Learning</h1>
            <p style={{ color: 'var(--text-muted)' }}>
              Welcome back, {user?.name}. You're enrolled in {courses.length} course{courses.length === 1 ? '' : 's'}.
            </p>
          </div>
          <Link to="/profile" className="btn btn-outline btn-sm">👤 My profile</Link>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="card stat-card">
          <div className="val">{courses.length}</div>
          <div className="label">Enrolled courses</div>
        </div>
        <div className="card stat-card">
          <div className="val">{totalLessons}</div>
          <div className="label">Total lessons</div>
        </div>
        <div className="card stat-card">
          <div className="val">{completed}</div>
          <div className="label">Lessons completed</div>
        </div>
        <div className="card stat-card">
          <div className="val">{doneCourses.length}</div>
          <div className="label">Certificates earned</div>
        </div>
      </div>

      {!loading && inProgress.length > 0 && (
        <>
          <div className="section-title"><h2>Continue learning</h2></div>
          <div className="resume-strip">
            {inProgress.map((c) => (
              <Link to={`/learn/${c.id}`} className="card resume-card" key={c.id}>
                <div className="r-title">{c.title}</div>
                {c.last_lesson && (
                  <div className="r-lesson">
                    Resume: {c.last_lesson.module_title} · {c.last_lesson.title}
                  </div>
                )}
                <div className="progress"><span style={{ width: `${c.progress}%` }} /></div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{c.progress}% complete</div>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="section-title"><h2>My courses</h2></div>
      {loading ? (
        <div className="page-loading"><div className="spinner" /></div>
      ) : courses.length === 0 ? (
        <div className="empty-state">
          <div className="big">🎓</div>
          <p>You haven't enrolled in any courses yet.</p>
          <Link to="/" className="btn btn-primary">Browse courses</Link>
        </div>
      ) : (
        <div className="dash-grid">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              progress={c.progress}
              onBookmarkToggle={(id, val) => setCourses((cs) => cs.map((x) => (x.id === id ? { ...x, bookmarked: val } : x)))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
