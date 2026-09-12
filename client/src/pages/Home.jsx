import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import CourseCard from '../components/CourseCard.jsx';

export default function Home() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/courses', { auth: false })
      .then((d) => setCourses(d.courses))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <h1>Learn in-demand skills with expert-led courses</h1>
          <p>
            Watch video lessons, download lecture notes, and track your progress —
            all in one place. Unlock your potential with LearnHub.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="#courses" className="btn btn-lg" style={{ background: '#fff', color: '#1e1b4b' }}>
              Browse courses
            </a>
            {!user && (
              <Link to="/register" className="btn btn-lg btn-outline" style={{ borderColor: '#7c86f5', color: '#fff' }}>
                Get started free
              </Link>
            )}
          </div>
          <div className="stats">
            <div className="stat"><b>{courses.length}</b><span>Courses</span></div>
            <div className="stat"><b>100%</b><span>Online</span></div>
            <div className="stat"><b>24/7</b><span>Access</span></div>
          </div>
        </div>
      </section>

      <div className="container" id="courses">
        <div className="section-title">
          <h2>Explore courses</h2>
        </div>
        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <div className="big">📚</div>
            <p>No courses published yet.</p>
          </div>
        ) : (
          <div className="course-grid">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
