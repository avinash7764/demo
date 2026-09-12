import { Link } from 'react-router-dom';
import { thumbUrl } from '../lib/api.js';

const CATEGORY_ICONS = {
  'Web Development': '💻',
  'Data Science': '📊',
  'Design': '🎨',
  'Business': '📈',
  'Marketing': '📣',
  'Mobile Development': '📱',
  'Cloud': '☁️',
};

export default function CourseCard({ course, progress }) {
  const thumb = thumbUrl(course.thumbnail);
  return (
    <Link to={`/courses/${course.id}`} className="course-card">
      <div className="course-thumb">
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
