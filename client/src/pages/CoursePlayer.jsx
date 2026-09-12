import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getToken } from '../lib/api.js';
import { useToast } from '../components/toast.jsx';

function fmt(sec) {
  if (!sec) return '';
  const m = Math.round(sec / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function CoursePlayer() {
  const { id } = useParams();
  const { toast } = useToast();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null); // active lesson
  const videoRef = useRef(null);
  const lastReport = useRef(0);
  const activeRef = useRef(null);

  useEffect(() => {
    api(`/courses/${id}`)
      .then((d) => {
        setCourse(d.course);
        const flat = d.course.modules.flatMap((m) => m.lessons);
        const firstIncomplete = flat.find((l) => !l.completed) || flat[0];
        setActive(firstIncomplete || null);
      })
      .catch(() => setCourse(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  function markComplete() {
    if (!active) return;
    api(`/student/lessons/${active.id}/progress`, { method: 'POST', body: { completed: true } }).then((d) => {
      setCourse((c) => {
        const mods = c.modules.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) => (l.id === active.id ? { ...l, completed: true } : l)),
        }));
        return { ...c, modules: mods, progress: d.progress };
      });
      toast('Lesson marked complete');
    });
  }

  function onTimeUpdate() {
    const v = videoRef.current;
    if (!v || !active) return;
    if (v.currentTime - lastReport.current >= 5) {
      lastReport.current = v.currentTime;
      const isDone = v.duration > 0 && v.currentTime / v.duration > 0.9;
      api(`/student/lessons/${active.id}/progress`, {
        method: 'POST',
        body: { watched_sec: Math.floor(v.currentTime), completed: isDone },
      }).then((d) => {
        setCourse((c) => ({ ...c, progress: d.progress }));
        if (isDone) {
          setCourse((c) => ({
            ...c,
            modules: c.modules.map((m) => ({
              ...m,
              lessons: m.lessons.map((l) => (l.id === active.id ? { ...l, completed: true } : l)),
            })),
          }));
        }
      }).catch(() => {});
    }
  }

  const flatLessons = useMemo(
    () => (course ? course.modules.flatMap((m) => m.lessons) : []),
    [course]
  );

  function nextLesson() {
    const i = flatLessons.findIndex((l) => l.id === active?.id);
    if (i >= 0 && i < flatLessons.length - 1) setActive(flatLessons[i + 1]);
  }
  function prevLesson() {
    const i = flatLessons.findIndex((l) => l.id === active?.id);
    if (i > 0) setActive(flatLessons[i - 1]);
  }

  useEffect(() => {
    lastReport.current = 0;
  }, [active?.id]);

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!course) {
    return (
      <div className="container" style={{ paddingTop: 60 }}>
        <div className="empty-state">
          <div className="big">🔍</div>
          <p>Course not found.</p>
          <Link to="/dashboard" className="btn btn-primary">Back to My Learning</Link>
        </div>
      </div>
    );
  }

  const videoUrl = active?.video_path
    ? `/api/student/lessons/${active.id}/stream?token=${encodeURIComponent(getToken())}`
    : null;
  const notesUrl = active?.notes_path
    ? `/api/student/lessons/${active.id}/notes?token=${encodeURIComponent(getToken())}`
    : null;

  return (
    <div className="player-shell">
      <div className="player-main">
        <div className="video-wrap">
          {videoUrl ? (
            <video
              key={active.id}
              ref={videoRef}
              src={videoUrl}
              controls
              controlsList="nodownload"
              onTimeUpdate={onTimeUpdate}
            />
          ) : (
            <div className="video-empty">
              <div style={{ fontSize: 44, marginBottom: 10 }}>🎬</div>
              {active ? 'No video uploaded for this lesson yet.' : 'Select a lesson to begin.'}
            </div>
          )}
        </div>

        {active && (
          <>
            <h2>{active.title}</h2>
            <div className="p-meta">
              {fmt(active.duration_sec)} {active.description ? ` · ${active.description}` : ''}
            </div>
            <div className="actions">
              <button className="btn btn-outline btn-sm" onClick={prevLesson} disabled={flatLessons.findIndex((l) => l.id === active.id) === 0}>
                ← Previous
              </button>
              <button className="btn btn-primary btn-sm" onClick={markComplete} disabled={active.completed}>
                {active.completed ? '✓ Completed' : 'Mark complete'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={nextLesson} disabled={flatLessons.findIndex((l) => l.id === active.id) === flatLessons.length - 1}>
                Next →
              </button>
              {notesUrl && (
                <a className="btn btn-outline btn-sm" href={notesUrl} target="_blank" rel="noreferrer">
                  📄 Download notes
                </a>
              )}
            </div>
            {active.notes_path && (
              <div className="notes-box">
                <strong>📝 Lecture notes</strong>
                <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>
                  Notes are available for this lesson. Use the “Download notes” button to save them.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <aside className="player-side">
        <div className="side-head">
          <Link to="/dashboard" className="back">← My Learning</Link>
          <h3 style={{ margin: '6px 0 0' }}>{course.title}</h3>
        </div>
        <div className="side-progress">
          <div className="p-label">{course.progress}% complete</div>
          <div className="progress"><span style={{ width: `${course.progress}%` }} /></div>
        </div>

        <ul className="lesson-nav">
          {course.modules.map((m) => (
            <li key={m.id}>
              <div className="module-label">{m.title}</div>
              <ul className="lesson-nav" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {m.lessons.map((l) => (
                  <li
                    key={l.id}
                    className={`lesson-nav-item ${l.id === active?.id ? 'active' : ''}`}
                    onClick={() => setActive(l)}
                  >
                    <span className={`l-check ${l.completed ? 'done' : ''}`}>
                      {l.completed ? '✓' : ''}
                    </span>
                    <span className="l-body">
                      <span className="t">{l.title}</span>
                      <span className="m">{l.video_path ? '🎬 ' : ''}{fmt(l.duration_sec)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
