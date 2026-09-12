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

  return (
    <div className="container">
      <div className="dash-head">
        <h1>My Learning</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Welcome back, {user?.name}. You're enrolled in {courses.length} course{courses.length === 1 ? '' : 's'}.
        </p>
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
      </div>

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
            <CourseCard key={c.id} course={c} progress={c.progress} />
          ))}
        </div>
      )}
    </div>
  );
}
