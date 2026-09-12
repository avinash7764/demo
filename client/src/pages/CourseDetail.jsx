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

function Stars({ value, size }) {
  return (
    <span className="stars" style={size ? { fontSize: size } : undefined}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(value) ? '' : 'off'}>★</span>
      ))}
    </span>
  );
}

function ReviewForm({ courseId, onSaved }) {
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState(null);

  useEffect(() => {
    api(`/student/courses/${courseId}/review`)
      .then((d) => {
        if (d.review) { setRating(d.review.rating); setComment(d.review.comment); setExisting(d.review); }
      })
      .catch(() => {});
  }, [courseId]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/student/courses/${courseId}/review`, { method: 'POST', body: { rating, comment } });
      toast(existing ? 'Review updated' : 'Thanks for your review!');
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm('Delete your review?')) return;
    await api(`/student/courses/${courseId}/review`, { method: 'DELETE' });
    setExisting(null); setComment(''); setRating(5);
    toast('Review deleted');
    onSaved();
  }

  return (
    <form className="card review-form" onSubmit={submit}>
      <h3 style={{ fontSize: 16, marginBottom: 12 }}>{existing ? 'Your review' : 'Leave a review'}</h3>
      <div className="field">
        <label>Your rating</label>
        <div className="star-input">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)}>★</span>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Comment</label>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did you think of this course?" />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : existing ? 'Update review' : 'Submit review'}</button>
        {existing && <button type="button" className="btn btn-danger" onClick={remove}>Delete</button>}
      </div>
    </form>
  );
}

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    api(`/courses/${id}`)
      .then((d) => setCourse(d.course))
      .catch(() => setCourse(null))
      .finally(() => setLoading(false));
  }, [id, user]);

  function loadReviews() {
    api(`/courses/${id}/reviews`, { auth: false })
      .then((d) => setReviews(d.reviews))
      .catch(() => {});
  }
  useEffect(loadReviews, [id]);

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
              {course.rating?.count > 0 && (
                <span className="badge" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
                  ★ {course.rating.average.toFixed(1)} ({course.rating.count})
                </span>
              )}
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
                {course.progress >= 100 ? (
                  <>
                    <div className="alert alert-success" style={{ marginBottom: 12 }}>🎉 Course completed!</div>
                    <Link to={`/certificate/${course.id}`} className="btn btn-outline btn-block" style={{ marginBottom: 10 }}>
                      View certificate
                    </Link>
                  </>
                ) : null}
                <Link to={`/learn/${course.id}`} className="btn btn-primary btn-block">
                  {course.progress > 0 ? 'Continue learning' : 'Start learning'}
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
              <li><b>Certificate</b> <span>On completion</span></li>
              <li><b>Level</b> <span>{course.level}</span></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="reviews-section">
        <div className="section-title">
          <h2>Student reviews</h2>
          {course.rating?.count > 0 && (
            <div className="rating-row">
              <Stars value={course.rating.average} />
              <span>{course.rating.average.toFixed(1)} · {course.rating.count} review{course.rating.count === 1 ? '' : 's'}</span>
            </div>
          )}
        </div>

        {user && user.role !== 'admin' && course.enrolled && (
          <ReviewForm courseId={course.id} onSaved={() => { loadReviews(); api(`/courses/${id}`).then((d) => setCourse(d.course)); }} />
        )}

        {reviews.length === 0 ? (
          <div className="empty-state" style={{ border: '1px dashed var(--border)', borderRadius: 12 }}>
            <p>No reviews yet. Be the first to share your experience!</p>
          </div>
        ) : (
          reviews.map((r) => (
            <div className="card review-card" key={r.id}>
              <div className="r-head">
                <span className="who">{r.author}</span>
                <Stars value={r.rating} size={15} />
                <span className="when">{new Date(r.created_at + 'Z').toLocaleDateString()}</span>
              </div>
              {r.comment && <div className="r-comment">{r.comment}</div>}
            </div>
          ))
        )}
      </section>
    </>
  );
}
