import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useToast } from '../components/toast.jsx';
import CourseCard from '../components/CourseCard.jsx';

export default function Wishlist() {
  const { toast } = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api('/student/bookmarks')
      .then((d) => setCourses(d.courses))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function remove(c) {
    try {
      await api(`/student/courses/${c.id}/bookmark`, { method: 'DELETE' });
      setCourses((prev) => prev.filter((x) => x.id !== c.id));
      toast('Removed from wishlist');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  return (
    <div className="container">
      <div className="dash-head">
        <h1>My wishlist</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Courses you've saved for later. {courses.length > 0 && `${courses.length} saved.`}
        </p>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner" /></div>
      ) : courses.length === 0 ? (
        <div className="empty-state">
          <div className="big">🔖</div>
          <p>Your wishlist is empty. Bookmark courses you want to take later.</p>
          <Link to="/" className="btn btn-primary">Browse courses</Link>
        </div>
      ) : (
        <div className="course-grid">
          {courses.map((c) => (
            <div style={{ position: 'relative' }} key={c.id}>
              <CourseCard course={c} />
              <button
                className="bookmark-btn on"
                title="Remove from wishlist"
                onClick={() => remove(c)}
                style={{ position: 'absolute', top: 8, right: 8, background: '#fff', borderRadius: 20, boxShadow: 'var(--shadow)' }}
              >
                🔖
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
