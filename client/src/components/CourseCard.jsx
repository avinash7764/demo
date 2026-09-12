import { Link } from 'react-router-dom';
import { api, thumbUrl } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from './toast.jsx';

const CATEGORY_ICONS = {
  'Web Development': '💻',
  'Data Science': '📊',
  'Design': '🎨',
  'Business': '📈',
  'Marketing': '📣',
  'Mobile Development': '📱',
  'Cloud': '☁️',
};

export default function CourseCard({ course, progress, onBookmarkToggle }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const thumb = thumbUrl(course.thumbnail);

  async function toggleBookmark(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      const next = !course.bookmarked;
      await api(`/student/courses/${course.id}/bookmark`, { method: next ? 'POST' : 'DELETE' });
      toast(next ? 'Saved to wishlist' : 'Removed from wishlist');
      onBookmarkToggle?.(course.id, next);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <Link to={`/courses/${course.id}`} className="course-card">
      <div className="course-thumb">
        {user && (
          <button
            className={`bookmark-btn ${course.bookmarked ? 'on' : ''}`}
            onClick={toggleBookmark}
            title={course.bookmarked ? 'Remove from wishlist' : 'Save to wishlist'}
            style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.92)', borderRadius: 20 }}
          >
            {course.bookmarked ? '♥' : '♡'}
          </button>
        )}
        {thumb ? (
          <img src={thumb} alt={course.title} loading="lazy" />
        ) : (
          <div className="placeholder">{CATEGORY_ICONS[course.category] || '📚'}</div>
        )}
      </div>
      <div className="course-card-body">
        <div>
          <span className="badge">{course.category}</span>
        </div>
        <h3>{course.title}</h3>
        <p className="desc">{course.description}</p>
        <div className="course-instructor">
          {course.instructor} · {course.lesson_count ?? 0} lessons
        </div>
        {typeof course.avg_rating === 'number' && course.avg_rating > 0 && (
          <div className="rating-row">
            <span className="stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= Math.round(course.avg_rating) ? '' : 'off'}>★</span>
              ))}
            </span>
            <span>{course.avg_rating.toFixed(1)} ({course.review_count ?? 0})</span>
          </div>
        )}
        {typeof progress === 'number' && progress > 0 && (
          <div>
            <div className="p-row" style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>{progress}% complete</span>
            </div>
            <div className="progress"><span style={{ width: `${progress}%` }} /></div>
          </div>
        )}
        <div className="course-meta">
          <span className="badge primary">{course.level}</span>
          {course.is_free ? <span className="badge success">Free</span> : <span className="badge">Paid</span>}
        </div>
      </div>
    </Link>
  );
}
